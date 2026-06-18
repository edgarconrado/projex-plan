import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types';
import { Colors, Typography, Spacing, Radius, getPriorityColor, getPriorityLabel } from '../../lib/theme';
import { Avatar } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
  showProject?: boolean;
}

export function TaskItem({ task, onPress, onToggle, showProject = true }: TaskItemProps) {
  const priorityColor = getPriorityColor(task.priority);
  const isCompleted = task.status === 'completed';
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;
  const completedCount = task.checklist?.filter((i) => i.is_completed).length ?? 0;
  const totalCount = task.checklist?.length ?? 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg,
        borderWidth: 0.5, borderColor: Colors.border,
        padding: Spacing.md, marginBottom: Spacing.sm,
        flexDirection: 'row', gap: Spacing.md,
      }}
    >
      <TouchableOpacity onPress={onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <View style={{
          width: 22, height: 22, borderRadius: 6,
          borderWidth: isCompleted ? 0 : 1.5,
          borderColor: isCompleted ? 'transparent' : Colors.border,
          backgroundColor: isCompleted ? Colors.primary : 'transparent',
          alignItems: 'center', justifyContent: 'center', marginTop: 2,
        }}>
          {isCompleted && <Ionicons name="checkmark" size={14} color={Colors.textInverse} />}
        </View>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        {/* Badge de proyecto */}
        {showProject && task.project?.name && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            marginBottom: 5, alignSelf: 'flex-start',
            backgroundColor: Colors.primaryMuted,
            paddingHorizontal: 8, paddingVertical: 2,
            borderRadius: Radius.full,
          }}>
            <Ionicons name="briefcase-outline" size={10} color={Colors.primary} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: Colors.primary }} numberOfLines={1}>
              {task.project.name}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 }}>
          <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: priorityColor }} />
          <Text
            style={[Typography.body, { fontWeight: '500', flex: 1 }, isCompleted && { textDecorationLine: 'line-through', color: Colors.textMuted }]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>

        {task.description ? (
          <Text style={[Typography.bodySmall, { color: Colors.textMuted, marginBottom: 6 }]} numberOfLines={1}>
            {task.description}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: `${priorityColor}20` }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: priorityColor }}>{getPriorityLabel(task.priority)}</Text>
          </View>

          {task.due_date && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="calendar-outline" size={11} color={isOverdue ? Colors.danger : Colors.textMuted} />
              <Text style={[Typography.caption, { color: isOverdue ? Colors.danger : Colors.textMuted }]}>
                {format(new Date(task.due_date), 'd MMM', { locale: es })}
              </Text>
            </View>
          )}

          {totalCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="list-outline" size={11} color={Colors.textMuted} />
              <Text style={[Typography.caption, { color: completedCount === totalCount ? Colors.success : Colors.textMuted }]}>
                {completedCount}/{totalCount}
              </Text>
            </View>
          )}

          {(task.floor || task.zone) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="layers-outline" size={11} color={Colors.textMuted} />
              <Text style={Typography.caption}>{[task.floor, task.zone].filter(Boolean).join(' · ')}</Text>
            </View>
          )}
        </View>
      </View>

      {task.assignee && <Avatar name={task.assignee.full_name} size={28} style={{ marginTop: 2 }} />}
    </TouchableOpacity>
  );
}
