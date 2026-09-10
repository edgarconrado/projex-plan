// ============================================================================
// src/lib/planFolders.ts
// Projex Plan — Carpetas de planos
// Paso 2 de 3: capa de datos
// ============================================================================

import { supabase } from './supabase';
import type { Plan } from '../types';

// Ojo: en `plans` cada revisión es un renglón. Todo lo que se muestre en
// listas debe filtrar is_current_revision, o se cuentan las revisiones viejas.
const PLAN_SELECT = '*, uploader:profiles(id, full_name), annotations:plan_annotations(*)';

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

export type PlanFolder = {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  position: number;
  plan_count: number;
  subfolder_count: number;
};

export type FolderCrumb = { id: string | null; name: string };

/** Error con mensaje ya listo para mostrar en pantalla. */
export class PlanFolderError extends Error {}

// ----------------------------------------------------------------------------
// Lecturas
// ----------------------------------------------------------------------------

/**
 * Trae TODAS las carpetas del proyecto con sus conteos, de una sola consulta.
 * El árbol se arma en memoria con los helpers de más abajo.
 */
export async function fetchFolderTree(projectId: string): Promise<PlanFolder[]> {
  const { data, error } = await supabase
    .from('plan_folder_counts')
    .select('folder_id, project_id, parent_id, name, position, plan_count, subfolder_count')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new PlanFolderError('No se pudieron cargar las carpetas');

  return (data ?? []).map((r: any) => ({
    id: r.folder_id,
    project_id: r.project_id,
    parent_id: r.parent_id,
    name: r.name,
    position: r.position,
    plan_count: Number(r.plan_count ?? 0),
    subfolder_count: Number(r.subfolder_count ?? 0),
  }));
}

/**
 * Planos vigentes de una carpeta. folderId = null devuelve los "Sin clasificar".
 *
 * Nota: se usa .is() para null y .eq() para el resto en vez de un .or().
 * Las consultas con .or() sobre columnas nullable ya han dado problemas
 * en este proyecto; separarlas es más aburrido y más confiable.
 */
export async function fetchPlansInFolder(
  projectId: string,
  folderId: string | null
): Promise<Plan[]> {
  let query = supabase
    .from('plans')
    .select(PLAN_SELECT)
    .eq('project_id', projectId)
    .eq('is_current_revision', true);

  query = folderId === null
    ? query.is('folder_id', null)
    : query.eq('folder_id', folderId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new PlanFolderError('No se pudieron cargar los planos');
  return (data ?? []) as Plan[];
}

/** Cuántos planos vigentes quedaron sin carpeta. Alimenta "Sin clasificar". */
export async function countUnfiledPlans(projectId: string): Promise<number> {
  const { count, error } = await supabase
    .from('plans')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('is_current_revision', true)
    .is('folder_id', null);

  if (error) throw new PlanFolderError('No se pudieron contar los planos sin clasificar');
  return count ?? 0;
}

// ----------------------------------------------------------------------------
// Helpers de árbol (puros, sin red)
// ----------------------------------------------------------------------------

export function childrenOf(tree: PlanFolder[], parentId: string | null): PlanFolder[] {
  return tree.filter((f) => f.parent_id === parentId);
}

/** Ruta desde la raíz hasta folderId, para el breadcrumb. */
export function breadcrumbOf(tree: PlanFolder[], folderId: string | null): FolderCrumb[] {
  const crumbs: FolderCrumb[] = [{ id: null, name: 'Planos' }];
  if (!folderId) return crumbs;

  const byId = new Map(tree.map((f) => [f.id, f]));
  const path: FolderCrumb[] = [];
  let current = byId.get(folderId);
  let guard = 0;

  while (current && guard++ < 25) {
    path.unshift({ id: current.id, name: current.name });
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }

  return [...crumbs, ...path];
}

/**
 * Ids de folderId y toda su descendencia. Necesario para el selector de
 * "mover carpeta": una carpeta no se puede mover dentro de sí misma.
 */
export function descendantIds(tree: PlanFolder[], folderId: string): Set<string> {
  const result = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of tree) {
      if (f.parent_id && result.has(f.parent_id) && !result.has(f.id)) {
        result.add(f.id);
        grew = true;
      }
    }
  }
  return result;
}

/** position para una carpeta nueva: al final de sus hermanas, con hueco de 10. */
function nextPosition(tree: PlanFolder[], parentId: string | null): number {
  const siblings = childrenOf(tree, parentId);
  if (siblings.length === 0) return 10;
  return Math.max(...siblings.map((s) => s.position)) + 10;
}

// ----------------------------------------------------------------------------
// Escrituras
// ----------------------------------------------------------------------------

/** Traduce el error de índice único a algo que el usuario entienda. */
function mapWriteError(error: any, fallback: string): PlanFolderError {
  if (error?.code === '23505') {
    return new PlanFolderError('Ya existe una carpeta con ese nombre aquí');
  }
  if (typeof error?.message === 'string' && error.message.includes('ciclo de carpetas')) {
    return new PlanFolderError('No puedes mover una carpeta dentro de sí misma');
  }
  return new PlanFolderError(fallback);
}

export async function createFolder(params: {
  projectId: string;
  parentId: string | null;
  name: string;
  tree: PlanFolder[];
}): Promise<PlanFolder> {
  const name = params.name.trim();
  if (!name) throw new PlanFolderError('El nombre no puede estar vacío');
  if (name.length > 80) throw new PlanFolderError('El nombre es demasiado largo (máx. 80)');

  const { data, error } = await supabase
    .from('plan_folders')
    .insert({
      project_id: params.projectId,
      parent_id: params.parentId,
      name,
      position: nextPosition(params.tree, params.parentId),
    })
    .select('id, project_id, parent_id, name, position')
    .single();

  if (error) throw mapWriteError(error, 'No se pudo crear la carpeta');
  return { ...(data as any), plan_count: 0, subfolder_count: 0 };
}

export async function renameFolder(folderId: string, newName: string): Promise<void> {
  const name = newName.trim();
  if (!name) throw new PlanFolderError('El nombre no puede estar vacío');

  const { error } = await supabase
    .from('plan_folders')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', folderId);

  if (error) throw mapWriteError(error, 'No se pudo renombrar la carpeta');
}

export async function moveFolder(folderId: string, newParentId: string | null): Promise<void> {
  const { error } = await supabase
    .from('plan_folders')
    .update({ parent_id: newParentId })
    .eq('id', folderId);

  if (error) throw mapWriteError(error, 'No se pudo mover la carpeta');
}

/**
 * Borra la carpeta. Las subcarpetas caen con ella (cascade) y sus planos
 * quedan sin clasificar (set null). Ningún plano se borra.
 * La UI debe advertir cuántos planos y subcarpetas se ven afectados.
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await supabase.from('plan_folders').delete().eq('id', folderId);
  if (error) throw new PlanFolderError('No se pudo eliminar la carpeta');
}

/**
 * Mueve planos a una carpeta. folderId = null los manda a "Sin clasificar".
 *
 * Mueve el grupo completo de revisiones, no solo la vigente: si solo se
 * moviera la actual, el historial quedaría regado entre carpetas y la
 * comparación de revisiones mostraría planos de dos lugares distintos.
 *
 * Se hacen dos updates en vez de un .or() por la misma razón de siempre.
 */
export async function movePlansToFolder(
  plans: Pick<Plan, 'id' | 'plan_group_id'>[],
  folderId: string | null
): Promise<void> {
  if (plans.length === 0) return;

  const groupIds = Array.from(
    new Set(plans.map((p) => p.plan_group_id ?? p.id))
  );

  // Renglones agrupados (revisiones 2 en adelante y la vigente).
  const { error: groupError } = await supabase
    .from('plans')
    .update({ folder_id: folderId })
    .in('plan_group_id', groupIds);

  if (groupError) throw new PlanFolderError('No se pudieron mover los planos');

  // El renglón raíz, por si quedó con plan_group_id nulo.
  const { error: rootError } = await supabase
    .from('plans')
    .update({ folder_id: folderId })
    .in('id', groupIds);

  if (rootError) throw new PlanFolderError('No se pudieron mover los planos');
}

/** Plantilla opcional de especialidades, al crear proyecto. */
export async function createDefaultFolders(projectId: string): Promise<void> {
  const { error } = await supabase.rpc('create_default_plan_folders', {
    p_project_id: projectId,
  });
  if (error) throw new PlanFolderError('No se pudo crear la estructura de carpetas');
}