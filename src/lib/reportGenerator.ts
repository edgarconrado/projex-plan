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
  budgetCategories?: { name: string; budgeted: number; spent: number }[];
  risks?: { name: string; responsible: string | null; status: string; probability: string; impact: string; mitigation: string | null }[];
  evmWeeks?: { week_number: number; week_date: string; pv: number; ev: number; ac: number }[];
}

export function generateReportHTML(data: ReportData): string {
  const { project, tasks, plans, documents, annotations, siteLog = [], budgetCategories = [], risks = [], evmWeeks = [] } = data;

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

    <!-- Presupuesto -->
    ${budgetCategories.length > 0 ? (() => {
      const totalBud = budgetCategories.reduce((s, c) => s + c.budgeted, 0);
      const totalSpt = budgetCategories.reduce((s, c) => s + c.spent, 0);
      const pct = totalBud > 0 ? Math.min(100, Math.round((totalSpt / totalBud) * 100)) : 0;
      const currency = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
      // Gráfica de pastel SVG
      const PIE_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'];
      const cx = 100, cy = 100, r = 85;
      let startAngle = -Math.PI / 2;
      const slices = budgetCategories.map((cat, i) => {
        const catPct = totalBud > 0 ? cat.budgeted / totalBud : 0;
        const angle = catPct * 2 * Math.PI;
        const endAngle = startAngle + angle;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = angle > Math.PI ? 1 : 0;
        const midAngle = startAngle + angle / 2;
        const lx = cx + (r * 0.65) * Math.cos(midAngle);
        const ly = cy + (r * 0.65) * Math.sin(midAngle);
        const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        const color = PIE_COLORS[i % PIE_COLORS.length];
        const label = catPct >= 0.07 ? `${Math.round(catPct * 100)}%` : '';
        startAngle = endAngle;
        return { path, color, label, lx, ly, name: cat.name, budgeted: cat.budgeted };
      });

      const pieHTML = `
        <div style="display:flex;align-items:center;gap:24px;margin-bottom:20px;">
          <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            ${slices.map(s => `
              <path d="${s.path}" fill="${s.color}" opacity="0.9"/>
              ${s.label ? `<text x="${s.lx.toFixed(1)}" y="${s.ly.toFixed(1)}" font-size="9" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${s.label}</text>` : ''}
            `).join('')}
          </svg>
          <div style="flex:1;">
            ${slices.map(s => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="width:12px;height:12px;border-radius:3px;background:${s.color};flex-shrink:0;"></div>
                <span style="font-size:11px;color:#111827;flex:1;">${s.name}</span>
                <span style="font-size:11px;color:#6B7280;font-weight:600;">${currency(s.budgeted)}</span>
              </div>
            `).join('')}
          </div>
        </div>`;

      const statusColor = (cat: { budgeted: number; spent: number }) => {
        const p = cat.spent / cat.budgeted;
        return p >= 1 ? '#EF4444' : p >= 0.8 ? '#F59E0B' : '#22C55E';
      };
      return `
      <div style="margin-top:32px;">
        <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
          💰 Control de presupuesto
        </h2>
        ${pieHTML}
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;background:#F3F4F6;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;">Presupuesto</div>
            <div style="font-size:16px;font-weight:800;color:#FFD700;margin-top:4px;">${currency(totalBud)}</div>
          </div>
          <div style="flex:1;min-width:120px;background:#F3F4F6;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;">Gastado</div>
            <div style="font-size:16px;font-weight:800;color:${totalSpt > totalBud ? '#EF4444' : '#111827'};margin-top:4px;">${currency(totalSpt)}</div>
          </div>
          <div style="flex:1;min-width:120px;background:#F3F4F6;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;">Disponible</div>
            <div style="font-size:16px;font-weight:800;color:${totalBud - totalSpt < 0 ? '#EF4444' : '#22C55E'};margin-top:4px;">${currency(totalBud - totalSpt)}</div>
          </div>
          <div style="flex:1;min-width:120px;background:#F3F4F6;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;">Avance</div>
            <div style="font-size:16px;font-weight:800;color:${pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#22C55E'};margin-top:4px;">${pct}%</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:32px;">
          <thead>
            <tr style="background:#F3F4F6;">
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:left;">CATEGORÍA</th>
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:right;">PRESUPUESTO</th>
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:right;">GASTADO</th>
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:right;">DISPONIBLE</th>
              <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">%</th>
            </tr>
          </thead>
          <tbody>
            ${budgetCategories.map(cat => {
              const cp = cat.budgeted > 0 ? Math.min(100, Math.round((cat.spent / cat.budgeted) * 100)) : 0;
              const sc = statusColor(cat);
              return `<tr style="border-bottom:1px solid #E5E7EB;">
                <td style="padding:8px 12px;font-size:12px;color:#111827;font-weight:600;">${cat.name}</td>
                <td style="padding:8px 12px;font-size:12px;color:#6B7280;text-align:right;">${currency(cat.budgeted)}</td>
                <td style="padding:8px 12px;font-size:12px;color:${cat.spent > cat.budgeted ? '#EF4444' : '#111827'};text-align:right;font-weight:600;">${currency(cat.spent)}</td>
                <td style="padding:8px 12px;font-size:12px;color:${cat.budgeted - cat.spent < 0 ? '#EF4444' : '#22C55E'};text-align:right;font-weight:600;">${currency(cat.budgeted - cat.spent)}</td>
                <td style="padding:8px 12px;text-align:center;"><span style="background:${sc}22;color:${sc};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;">${cp}%</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    })() : ''}

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

    <!-- Gantt -->
    ${(() => {
      const ganttTasks = tasks.filter(t => t.due_date);
      if (ganttTasks.length === 0) return '';
      const allDates = ganttTasks.flatMap(t => [
        new Date(t.start_date ?? t.created_at),
        new Date(t.due_date!),
      ]);
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 1);
      const statusColor = (s: string) => s === 'completed' ? '#22C55E' : s === 'in_progress' ? '#F59E0B' : s === 'in_review' ? '#3B82F6' : s === 'cancelled' ? '#EF4444' : '#9CA3AF';
      const statusLabel = (s: string) => s === 'completed' ? 'Completada' : s === 'in_progress' ? 'En progreso' : s === 'in_review' ? 'En revisión' : s === 'cancelled' ? 'Cancelada' : 'Pendiente';
      // Generar encabezados de semana
      const weekCols: { label: string; pct: number }[] = [];
      let cur = new Date(minDate);
      while (cur <= maxDate) {
        const weekEnd = new Date(cur); weekEnd.setDate(weekEnd.getDate() + 6);
        const days = Math.min(7, Math.ceil((maxDate.getTime() - cur.getTime()) / 86400000) + 1);
        weekCols.push({ label: `S${Math.ceil((cur.getTime() - minDate.getTime()) / 86400000 / 7) + 1}`, pct: (days / totalDays) * 100 });
        cur.setDate(cur.getDate() + days);
      }
      const todayOffset = (new Date().getTime() - minDate.getTime()) / 86400000;
      const todayPct = Math.min(100, Math.max(0, (todayOffset / totalDays) * 100));
      return `
      <div style="margin-top:32px;">
        <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
          📅 Diagrama Gantt (${ganttTasks.length} actividades)
        </h2>
        <div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:32px;">
          <!-- Header semanas -->
          <div style="display:flex;background:#F3F4F6;border-bottom:1px solid #E5E7EB;">
            <div style="width:200px;min-width:200px;padding:6px 10px;font-size:10px;font-weight:700;color:#374151;border-right:1px solid #E5E7EB;">ACTIVIDAD</div>
            <div style="flex:1;position:relative;display:flex;">
              ${weekCols.map(w => `<div style="width:${w.pct}%;padding:4px 2px;font-size:9px;font-weight:700;color:#6B7280;text-align:center;border-right:1px solid #E5E7EB;overflow:hidden;">${w.label}</div>`).join('')}
            </div>
          </div>
          <!-- Filas de tareas -->
          ${ganttTasks.map((t, idx) => {
            const start = new Date(t.start_date ?? t.created_at);
            const end = new Date(t.due_date!);
            const startPct = Math.max(0, (start.getTime() - minDate.getTime()) / 86400000 / totalDays * 100);
            const durPct = Math.max(1, (end.getTime() - start.getTime()) / 86400000 / totalDays * 100);
            const color = statusColor(t.status);
            const pct = t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : t.status === 'in_review' ? 75 : 0;
            return `
            <div style="display:flex;border-bottom:1px solid #F3F4F6;background:${idx % 2 === 0 ? 'white' : '#F9FAFB'};">
              <div style="width:200px;min-width:200px;padding:6px 10px;font-size:10px;color:#111827;border-right:1px solid #E5E7EB;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${t.title}</div>
              <div style="flex:1;position:relative;height:28px;display:flex;align-items:center;">
                <!-- Hoy marker -->
                <div style="position:absolute;left:${todayPct}%;top:0;bottom:0;width:1px;background:#EF444460;z-index:1;"></div>
                <!-- Barra de fondo -->
                <div style="position:absolute;left:${startPct}%;width:${Math.min(durPct, 100 - startPct)}%;height:16px;background:${color}20;border-radius:4px;border:1px solid ${color}60;overflow:hidden;">
                  <!-- Progreso -->
                  <div style="width:${pct}%;height:100%;background:${color}70;border-radius:3px;"></div>
                </div>
                ${pct > 0 ? `<span style="position:absolute;left:calc(${startPct}% + 4px);font-size:8px;font-weight:700;color:${color};z-index:2;">${pct}%</span>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <!-- Leyenda -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
          ${['completed','in_progress','in_review','pending','cancelled'].map(s => `
          <div style="display:flex;align-items:center;gap:4px;">
            <div style="width:10px;height:10px;border-radius:2px;background:${statusColor(s)};"></div>
            <span style="font-size:10px;color:#6B7280;">${statusLabel(s)}</span>
          </div>`).join('')}
          <div style="display:flex;align-items:center;gap:4px;">
            <div style="width:1px;height:12px;background:#EF4444;"></div>
            <span style="font-size:10px;color:#6B7280;">Hoy</span>
          </div>
        </div>
      </div>`;
    })()}

    <!-- Registro de Riesgos -->
    ${risks.length > 0 ? (() => {
      const levelScore = (l: string) => l === 'A' ? 3 : l === 'M' ? 2 : 1;
      const levelLabel = (l: string) => l === 'A' ? 'Alta' : l === 'M' ? 'Media' : 'Baja';
      const qualColor = (q: string) => q === 'MA' ? '#7C3AED' : q === 'A' ? '#EF4444' : q === 'M' ? '#F59E0B' : q === 'B' ? '#3B82F6' : '#22C55E';
      const statusColor = (s: string) => s === 'Abierto' ? '#EF4444' : s === 'Presente' ? '#F59E0B' : '#22C55E';
      const abiertos = risks.filter(r => r.status === 'Abierto').length;
      const presentes = risks.filter(r => r.status === 'Presente').length;
      const cerrados = risks.filter(r => r.status === 'Cerrado').length;
      return `
      <div style="margin-top:32px;">
        <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
          ⚠️ Registro de riesgos (${risks.length})
        </h2>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <div style="flex:1;background:#EF444415;border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#EF4444;">${abiertos}</div><div style="font-size:10px;color:#EF4444;font-weight:600;">ABIERTOS</div></div>
          <div style="flex:1;background:#F59E0B15;border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#F59E0B;">${presentes}</div><div style="font-size:10px;color:#F59E0B;font-weight:600;">PRESENTES</div></div>
          <div style="flex:1;background:#22C55E15;border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#22C55E;">${cerrados}</div><div style="font-size:10px;color:#22C55E;font-weight:600;">CERRADOS</div></div>
        </div>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:32px;">
          <thead>
            <tr style="background:#F3F4F6;">
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#374151;text-align:left;">#</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#374151;text-align:left;">RIESGO</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#374151;text-align:center;">RESP.</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#374151;text-align:center;">ESTADO</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#374151;text-align:center;">PROB.</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#374151;text-align:center;">IMP.</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#374151;text-align:center;">NPR</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#374151;text-align:left;">MITIGACIÓN</th>
            </tr>
          </thead>
          <tbody>
            ${risks.map((r, i) => {
              const score = levelScore(r.probability) * levelScore(r.impact);
              const qual = score >= 9 ? 'MA' : score >= 6 ? 'A' : score >= 4 ? 'M' : score >= 2 ? 'B' : 'MB';
              const qc = qualColor(qual);
              const sc = statusColor(r.status);
              return `<tr style="border-bottom:1px solid #E5E7EB;">
                <td style="padding:7px 10px;font-size:11px;color:#6B7280;">${i + 1}</td>
                <td style="padding:7px 10px;font-size:11px;color:#111827;font-weight:600;">${r.name}</td>
                <td style="padding:7px 10px;font-size:11px;color:#6B7280;text-align:center;">${r.responsible ?? '—'}</td>
                <td style="padding:7px 10px;text-align:center;"><span style="background:${sc}20;color:${sc};padding:2px 6px;border-radius:9999px;font-size:10px;font-weight:700;">${r.status}</span></td>
                <td style="padding:7px 10px;font-size:11px;color:#374151;text-align:center;">${levelLabel(r.probability)}</td>
                <td style="padding:7px 10px;font-size:11px;color:#374151;text-align:center;">${levelLabel(r.impact)}</td>
                <td style="padding:7px 10px;text-align:center;"><span style="background:${qc}20;color:${qc};padding:2px 6px;border-radius:9999px;font-size:10px;font-weight:800;">${qual}·${score}</span></td>
                <td style="padding:7px 10px;font-size:10px;color:#6B7280;">${r.mitigation ?? '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    })() : ''}

    <!-- EVM -->
    ${evmWeeks.length > 0 ? (() => {
      const last = evmWeeks[evmWeeks.length - 1];
      const cpi = last.ac > 0 ? (last.ev / last.ac).toFixed(2) : '—';
      const spi = last.pv > 0 ? (last.ev / last.pv).toFixed(2) : '—';
      const cpiN = last.ac > 0 ? last.ev / last.ac : null;
      const spiN = last.pv > 0 ? last.ev / last.pv : null;
      const cpiColor = cpiN === null ? '#6B7280' : cpiN >= 1 ? '#22C55E' : cpiN >= 0.9 ? '#F59E0B' : '#EF4444';
      const spiColor = spiN === null ? '#6B7280' : spiN >= 1 ? '#22C55E' : spiN >= 0.9 ? '#F59E0B' : '#EF4444';
      const currency = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
      return `
      <div style="margin-top:32px;">
        <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #FFD700;">
          📈 Earned Value Management (EVM)
        </h2>
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:100px;background:${cpiColor}15;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;">CPI</div>
            <div style="font-size:28px;font-weight:800;color:${cpiColor};">${cpi}</div>
            <div style="font-size:10px;color:${cpiColor};">${cpiN === null ? '' : cpiN >= 1 ? 'Bajo presupuesto' : 'Sobre presupuesto'}</div>
          </div>
          <div style="flex:1;min-width:100px;background:${spiColor}15;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;">SPI</div>
            <div style="font-size:28px;font-weight:800;color:${spiColor};">${spi}</div>
            <div style="font-size:10px;color:${spiColor};">${spiN === null ? '' : spiN >= 1 ? 'Adelantado' : 'Retrasado'}</div>
          </div>
          <div style="flex:1;min-width:100px;background:#3B82F615;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;">PV Acum.</div>
            <div style="font-size:16px;font-weight:800;color:#3B82F6;">${currency(last.pv)}</div>
          </div>
          <div style="flex:1;min-width:100px;background:#22C55E15;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;">EV Acum.</div>
            <div style="font-size:16px;font-weight:800;color:#22C55E;">${currency(last.ev)}</div>
          </div>
          <div style="flex:1;min-width:100px;background:#F59E0B15;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6B7280;font-weight:600;">AC Acum.</div>
            <div style="font-size:16px;font-weight:800;color:#F59E0B;">${currency(last.ac)}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:32px;">
          <thead>
            <tr style="background:#F3F4F6;">
              <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">SEMANA</th>
              <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">FECHA</th>
              <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#3B82F6;text-align:right;">PV</th>
              <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#22C55E;text-align:right;">EV</th>
              <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#F59E0B;text-align:right;">AC</th>
              <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">CPI</th>
              <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#374151;text-align:center;">SPI</th>
            </tr>
          </thead>
          <tbody>
            ${evmWeeks.map(w => {
              const wCpi = w.ac > 0 ? (w.ev / w.ac).toFixed(2) : '—';
              const wSpi = w.pv > 0 ? (w.ev / w.pv).toFixed(2) : '—';
              const wCpiN = w.ac > 0 ? w.ev / w.ac : null;
              const wSpiN = w.pv > 0 ? w.ev / w.pv : null;
              return `<tr style="border-bottom:1px solid #E5E7EB;">
                <td style="padding:7px 12px;font-size:12px;font-weight:700;color:#111827;text-align:center;">${w.week_number}</td>
                <td style="padding:7px 12px;font-size:11px;color:#6B7280;text-align:center;">${fmt(w.week_date)}</td>
                <td style="padding:7px 12px;font-size:11px;color:#3B82F6;text-align:right;">${currency(w.pv)}</td>
                <td style="padding:7px 12px;font-size:11px;color:#22C55E;text-align:right;">${currency(w.ev)}</td>
                <td style="padding:7px 12px;font-size:11px;color:#F59E0B;text-align:right;">${currency(w.ac)}</td>
                <td style="padding:7px 12px;font-size:11px;font-weight:700;color:${wCpiN === null ? '#6B7280' : wCpiN >= 1 ? '#22C55E' : '#EF4444'};text-align:center;">${wCpi}</td>
                <td style="padding:7px 12px;font-size:11px;font-weight:700;color:${wSpiN === null ? '#6B7280' : wSpiN >= 1 ? '#22C55E' : '#EF4444'};text-align:center;">${wSpi}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    })() : ''}

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
