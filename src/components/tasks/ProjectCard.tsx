import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Project } from '../../types';
import {
  Colors, Typography, Spacing, Radius,
  getStatusColor, getStatusLabel, getPriorityColor,
} from '../../lib/theme';
import { Avatar, ProgressBar, Badge } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const statusColor = getStatusColor(project.status);

  const taskCount = 0; // se llenará en paso de tareas
  const memberCount = project.members?.length ?? 0;

  const deadlineText = project.deadline
    ? format(new Date(project.deadline), 'd MMM yyyy', { locale: es })
    : null;

  const isOverdue =
    project.deadline &&
    new Date(project.deadline) < new Date() &&
    project.status !== 'completed';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        backgroundColor: Colors.surfaceSecondary,
        borderRadius: Radius.lg,
        borderWidth: 0.5,
        borderColor: Colors.border,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
        <View style={{ flex: 1, marginRight: Spacing.md }}>
          <Text style={[Typography.h4, { marginBottom: 4 }]} numberOfLines={1}>
            {project.name}
          </Text>
          {project.description ? (
            <Text style={[Typography.bodySmall, { color: Colors.textMuted }]} numberOfLines={2}>
              {project.description}
            </Text>
          ) : null}
        </View>
        <Badge
          label={getStatusLabel(project.status)}
          color={statusColor}
          bgColor={`${statusColor}20`}
        />
      </View>

      {/* Progreso */}
      <View style={{ marginBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={[Typography.caption, { color: Colors.textMuted }]}>Progreso</Text>
          <Text style={[Typography.caption, { color: Colors.primary, fontWeight: '600' }]}>
            {project.progress}%
          </Text>
        </View>
        <ProgressBar value={project.progress} color={statusColor} height={5} />
      </View>

      {/* Footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Miembros */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row' }}>
            {project.members?.slice(0, 3).map((m, i) => (
              <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <Avatar
                  name={m.profile?.full_name ?? '?'}
                  size={24}
                  style={{ borderWidth: 1.5, borderColor: Colors.surfaceSecondary }}
                />
              </View>
            ))}
          </View>
          {memberCount > 0 && (
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>
              {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
            </Text>
          )}
        </View>

        {/* Deadline */}
        {deadlineText && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={isOverdue ? Colors.danger : Colors.textMuted}
            />
            <Text style={[
              Typography.caption,
              { color: isOverdue ? Colors.danger : Colors.textMuted },
            ]}>
              {deadlineText}
            </Text>
          </View>
        )}

        {/* Ciudad */}
        {project.city && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={[Typography.caption, { color: Colors.textMuted }]} numberOfLines={1}>
              {project.city}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
