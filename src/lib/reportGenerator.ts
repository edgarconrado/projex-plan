import { Project, Task, Plan, Document, PlanAnnotation } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { APP_ICON_BASE64 } from './appIconBase64';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En progreso',
  in_review: 'En revisión', completed: 'Completada',
  cancelled: 'Cancelada',
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
};
const STATUS_COLORS: Record<string, string> = {
  pending: '#6B7280', in_progress: '#F59E0B',
  in_review: '#3B82F6', completed: '#22C55E', cancelled: '#EF4444',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: '#6B7280', medium: '#F59E0B', high: '#EF4444', critical: '#7C3AED',
};

function fmt(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), "d 'de' MMMM yyyy", { locale: es }); }
  catch { return dateStr; }
}

function formatCurrency(amount?: number | null): string {
  if (amount == null) return '—';
  return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export interface ReportData {
  project: Project;
  tasks: Task[];
  plans: Plan[];
  documents: Document[];
  annotations: PlanAnnotation[];
  siteLog?: { id: string; activity: string; observations?: string | null; visited_at: string; creator?: { full_name: string } | null }[];
}

export function generateReportHTML(data: ReportData): string {
  const { project, tasks, plans, documents, annotations, siteLog = [] } = data;

  const totalTasks = tasks.length;
  const byStatus = {
    completed: tasks.filter(t => t.status === 'completed').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  };
  const byPriority = {
    critical: tasks.filter(t => t.priority === 'critical').length,
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };
  const overdueTasks = tasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
  );

  // Anotaciones tipo referencia con imagen
  const photoRefs = annotations.filter(a =>
    a.type === 'reference' && a.attachment_thumbnail &&
    a.attachment_type?.startsWith('image/')
  );

  const generatedAt = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });

  const tasksHTML = tasks.map(task => `
    <tr style="border-bottom:1px solid #E5E7EB;">
      <td style="padding:8px 12px;font-size:12px;color:#111827;">${task.title}</td>
      <td style="padding:8px 12px;text-align:center;">
        <span style="background:${STATUS_COLORS[task.status] ?? '#6B7280'}22;color:${STATUS_COLORS[task.status] ?? '#6B7280'};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">
          ${STATUS_LABELS[task.status] ?? task.status}
        </span>
      </td>
      <td style="padding:8px 12px;text-align:center;">
        <span style="background:${PRIORITY_COLORS[task.priority] ?? '#6B7280'}22;color:${PRIORITY_COLORS[task.priority] ?? '#6B7280'};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">
          ${PRIORITY_LABELS[task.priority] ?? task.priority}
        </span>
      </td>
      <td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">${task.assignee?.full_name ?? '—'}</td>
      <td style="padding:8px 12px;font-size:11px;color:${task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' ? '#EF4444' : '#6B7280'};text-align:center;">
        ${fmt(task.due_date)}
      </td>
      ${task.floor ? `<td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">${task.floor}</td>` : '<td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">—</td>'}
    </tr>
  `).join('');

  const plansHTML = plans.map(plan => `
    <tr style="border-bottom:1px solid #E5E7EB;">
      <td style="padding:8px 12px;font-size:12px;color:#111827;">${plan.code}</td>
      <td style="padding:8px 12px;font-size:12px;color:#111827;">${plan.title}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6B7280;">${plan.discipline}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">${plan.revision ?? '—'}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">${plan.status ?? '—'}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">${fmt(plan.created_at)}</td>
    </tr>
  `).join('');

  const docsHTML = documents.map(doc => `
    <tr style="border-bottom:1px solid #E5E7EB;">
      <td style="padding:8px 12px;font-size:12px;color:#111827;">${doc.file_name}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6B7280;">${doc.document_type ?? '—'}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">v${doc.version}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">${fmt(doc.created_at)}</td>
    </tr>
  `).join('');

  const photosHTML = photoRefs.length > 0 ? `
    <div style="margin-top:32px;">
      <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
        📸 Fotos de evidencia
      </h2>
      <div style="background:#F3F4F6;border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px;">
        <div style="font-size:32px;font-weight:800;color:#FFD700;">${photoRefs.length}</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#111827;">
            foto${photoRefs.length !== 1 ? 's' : ''} de evidencia adjunta${photoRefs.length !== 1 ? 's' : ''}
          </div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px;">
            ${photoRefs.map(r => r.label ?? 'Referencia sin etiqueta').join(' · ')}
          </div>
        </div>
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte — ${project.name}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9FAFB;color:#111827;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0A0A0A 0%,#1A1A1A 100%);padding:32px 40px;color:white;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div style="display:flex;align-items:center;gap:20px;">
        <img src="${APP_ICON_BASE64}" style="width:56px;height:56px;border-radius:14px;" />
        <div>
          <div style="font-size:11px;font-weight:600;color:#FFD700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">
            REPORTE DE AVANCE
          </div>
          <h1 style="font-size:28px;font-weight:800;margin:0;color:white;">${project.name}</h1>
          ${project.address ? `<p style="font-size:13px;color:#9CA3AF;margin:6px 0 0;">${project.address}${project.city ? ', ' + project.city : ''}</p>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#9CA3AF;">Generado el</div>
        <div style="font-size:13px;color:#E5E7EB;font-weight:500;">${generatedAt}</div>
        <div style="margin-top:12px;background:#FFD700;color:#0A0A0A;padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:700;display:inline-block;">
          ${project.status === 'completed' ? 'Completado' : project.status === 'in_progress' ? 'En progreso' : project.status === 'on_hold' ? 'En pausa' : project.status}
        </div>
      </div>
    </div>
  </div>

  <div style="padding:32px 40px;">

    <!-- Info general -->
    <div style="display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap;">
      ${project.deadline ? `
      <div style="flex:1;min-width:150px;background:white;border-radius:12px;padding:16px;border:1px solid #E5E7EB;">
        <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Fecha límite</div>
        <div style="font-size:15px;font-weight:700;color:#111827;margin-top:4px;">${fmt(project.deadline)}</div>
      </div>` : ''}
      ${project.budget ? `
      <div style="flex:1;min-width:150px;background:white;border-radius:12px;padding:16px;border:1px solid #E5E7EB;">
        <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Presupuesto</div>
        <div style="font-size:15px;font-weight:700;color:#111827;margin-top:4px;">${formatCurrency(project.budget)}</div>
      </div>` : ''}
      <div style="flex:1;min-width:150px;background:white;border-radius:12px;padding:16px;border:1px solid #E5E7EB;">
        <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Progreso</div>
        <div style="font-size:24px;font-weight:800;color:#FFD700;margin-top:4px;">${project.progress ?? 0}%</div>
        <div style="background:#E5E7EB;border-radius:9999px;height:6px;margin-top:8px;">
          <div style="background:#FFD700;height:6px;border-radius:9999px;width:${project.progress ?? 0}%;"></div>
        </div>
      </div>
    </div>

    <!-- Resumen de tareas -->
    <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
      📋 Resumen de tareas (${totalTasks})
    </h2>
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
      ${Object.entries(byStatus).filter(([,v]) => v > 0).map(([k, v]) => `
        <div style="background:${STATUS_COLORS[k] ?? '#6B7280'}15;border:1px solid ${STATUS_COLORS[k] ?? '#6B7280'}40;border-radius:10px;padding:12px 20px;text-align:center;min-width:80px;">
          <div style="font-size:22px;font-weight:800;color:${STATUS_COLORS[k] ?? '#6B7280'};">${v}</div>
          <div style="font-size:10px;font-weight:600;color:${STATUS_COLORS[k] ?? '#6B7280'};margin-top:2px;">${STATUS_LABELS[k] ?? k}</div>
        </div>
      `).join('')}
    </div>

    ${overdueTasks.length > 0 ? `
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 16px;margin-bottom:24px;font-size:12px;color:#991B1B;">
      ⚠️ <strong>${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} vencida${overdueTasks.length > 1 ? 's' : ''}</strong>: ${overdueTasks.map(t => t.title).join(', ')}
    </div>` : ''}

    <!-- Prioridad -->
    <div style="display:flex;gap:12px;margin-bottom:32px;flex-wrap:wrap;">
      ${Object.entries(byPriority).filter(([,v]) => v > 0).map(([k, v]) => `
        <div style="background:white;border:1px solid #E5E7EB;border-left:4px solid ${PRIORITY_COLORS[k] ?? '#6B7280'};border-radius:8px;padding:10px 16px;min-width:80px;">
          <div style="font-size:18px;font-weight:800;color:#111827;">${v}</div>
          <div style="font-size:10px;color:#6B7280;margin-top:2px;">${PRIORITY_LABELS[k] ?? k}</div>
        </div>
      `).join('')}
    </div>

    <!-- Tabla de tareas -->
    ${tasks.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
      📌 Detalle de tareas
    </h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:32px;">
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:left;">TAREA</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">ESTADO</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">PRIORIDAD</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">RESPONSABLE</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">FECHA LÍMITE</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">PISO</th>
        </tr>
      </thead>
      <tbody>${tasksHTML}</tbody>
    </table>` : ''}

    <!-- Planos -->
    ${plans.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
      🗺️ Planos (${plans.length})
    </h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:32px;">
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:left;">CÓDIGO</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:left;">TÍTULO</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;">DISCIPLINA</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">REV.</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">ESTADO</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">FECHA</th>
        </tr>
      </thead>
      <tbody>${plansHTML}</tbody>
    </table>` : ''}

    <!-- Documentos -->
    ${documents.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
      📄 Documentos (${documents.length})
    </h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:32px;">
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:left;">ARCHIVO</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;">TIPO</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">VERSIÓN</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">FECHA</th>
        </tr>
      </thead>
      <tbody>${docsHTML}</tbody>
    </table>` : ''}

    ${photosHTML}

    <!-- Tareas completadas con evidencia fotográfica -->
    ${(() => {
      const withEvidence = tasks.filter(t => t.status === 'completed' && t.evidence_photo_url);
      if (withEvidence.length === 0) return '';
      return `
      <div style="margin-top:32px;">
        <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
          📸 Evidencia fotográfica de tareas completadas (${withEvidence.length})
        </h2>
        <div style="background:#F3F4F6;border-radius:10px;padding:12px 16px;">
          <div style="font-size:12px;color:#374151;">
            ${withEvidence.map(t => `• ${t.title} — completada por ${t.assignee?.full_name ?? 'sin asignar'}`).join('<br/>')}
          </div>
          <div style="font-size:11px;color:#6B7280;margin-top:8px;font-style:italic;">
            Las fotos de evidencia están disponibles en la app Projex Plan.
          </div>
        </div>
      </div>`;
    })()}

    <!-- Bitácora de obra -->
    ${siteLog.length > 0 ? `
    <div style="margin-top:32px;">
      <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
        📓 Bitácora de obra (${siteLog.length} registro${siteLog.length !== 1 ? 's' : ''})
      </h2>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:32px;">
        <thead>
          <tr style="background:#F3F4F6;">
            <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:left;">FECHA Y HORA</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:left;">ACTIVIDAD</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:left;">OBSERVACIONES</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">REGISTRADO POR</th>
          </tr>
        </thead>
        <tbody>
          ${siteLog.map(entry => `
          <tr style="border-bottom:1px solid #E5E7EB;">
            <td style="padding:8px 12px;font-size:11px;color:#6B7280;white-space:nowrap;">
              ${fmt(entry.visited_at)}<br/>
              <span style="font-size:10px;">${new Date(entry.visited_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
            </td>
            <td style="padding:8px 12px;font-size:12px;color:#111827;">${entry.activity}</td>
            <td style="padding:8px 12px;font-size:11px;color:#6B7280;">${entry.observations ?? '—'}</td>
            <td style="padding:8px 12px;font-size:11px;color:#6B7280;text-align:center;">${entry.creator?.full_name ?? '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #E5E7EB;text-align:center;">
      <img src="${APP_ICON_BASE64}" style="width:28px;height:28px;border-radius:7px;vertical-align:middle;margin-right:8px;" />
      <span style="font-size:11px;color:#9CA3AF;">
        Generado por <strong style="color:#374151;">Projex Plan</strong> · ${generatedAt}
      </span>
      <div style="margin-top:8px;font-size:10px;color:#D1D5DB;font-style:italic;">
        Este documento es un reporte oficial de avance generado digitalmente.<br/>
        Para mayor información contacte al administrador del proyecto.
      </div>
    </div>

  </div>
</body>
</html>`;
}
