/**
 * نظام صوت الإشعارات
 * تنبيهات صوتية للأحداث المهمة
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ==================== أنواع الأصوات ====================
export type SoundType =
    | 'notification'
    | 'message'
    | 'success'
    | 'error'
    | 'warning'
    | 'ticket_new'
    | 'ticket_update'
    | 'mention';

export interface SoundSettings {
    enabled: boolean;
    volume: number; // 0-1
    sounds: Record<SoundType, boolean>;
    muteUntil?: string; // ISO date string
}

// ==================== إعدادات افتراضية ====================
const DEFAULT_SETTINGS: SoundSettings = {
    enabled: true,
    volume: 0.5,
    sounds: {
        notification: true,
        message: true,
        success: true,
        error: true,
        warning: true,
        ticket_new: true,
        ticket_update: true,
        mention: true
    }
};

const STORAGE_KEY = 'notification_sounds';

// ==================== ملفات الأصوات (Base64) ====================
// أصوات مضمنة بتشفير Base64 لتجنب الحاجة لملفات خارجية

const SOUNDS: Record<SoundType, string> = {
    notification: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACBhYmLjI6Nj42NjIuKiYiHhoaGhYaGhoeIiYqLjI2Njo6Ojo2NjIuKiYiHh4aGhYWFhYaGh4eIiYqLjI2Njo6Ojo6NjIyLioqJiIeHhoaGhYWGhoeHiImKi4yNjY6Ojo6OjYyMi4qKiYiIh4eGhoaGhoaHh4iJiouMjY2Ojo6Ojo2NjIuLioqJiIiHh4aGhoeHh4iIiYqLjI2Njo6Ojo6NjYyMi4uKiYmIiIeHh4eHh4eIiImKi4yMjY6Ojo6OjY2MjIuLioqJiIiIh4eHh4eIiImJiouMjI2Njo6OjY2NjIyLi4qKiYmIiIeHh4eHiIiJiYqLi4yNjY2Ojo2NjYyMi4uKioqJiIiIh4eHiIiIiYmKi4uMjI2NjY2NjY2MjIyLi4qKiYmJiIiHiIiIiImJiouLjIyMjY2NjY2NjIyMi4uKioqJiYiIiIiIiIiJiYqKi4uMjI2NjY2NjYyMjIuLioqKiYmJiIiIiIiJiYmKiouLjIyMjY2NjY2MjIyLi4uKioqJiYmIiIiJiYmJioqLi4yMjI2NjY2NjIyMi4uLioqKiYmJiYmJiYmJiYqKi4uMjIyNjY2NjYyMjIuLi4qKiomJiYmJiYmJiYqKiouLjIyMjY2NjYyMjIyLi4uKioqJiYmJiYmJiYqKiouLi4yMjI2NjY2MjIyLi4uLioqKiYmJiYmJiYqKioqLi4uMjIyMjY2NjIyMi4uLi4qKiomJiYmJiYmKioqLi4uMjIyMjY2NjIyMi4uLi4qKioqJiYmJiYqKioqLi4uMjIyMjIyMjIyMi4uLi4qKioqJiYmJioqKioqLi4uMjIyMjIyMjIyLi4uLioqKiomJiYmKioqKi4uLi4yMjIyMjIyMi4uLi4uKioqKiYmJioqKiouLi4yMjIyMjIyMjIuLi4uKioqKioqKioqKiouLi4yMjIyMjIyMi4uLi4uKioqKioqKioqKi4uLi4yMjIyMjIyLi4uLi4uKioqKioqKioqLi4uLjIyMjIyMjIuLi4uLioqKioqKioqKi4uLi4yMjIyMjIyLi4uLi4qKioqKioqKi4uLi4yMjIyMjIuLi4uLi4qKioqKioqKi4uLi4yMjIyMjIuLi4uLi4qKioqKioqLi4uLi4yMjIyMi4uLi4uLi4qKioqKioqLi4uLjIyMjIyLi4uLi4uLioqKioqKi4uLi4uMjIyMi4uLi4uLi4uKioqKioqLi4uLi4yMjIyLi4uLi4uLi4qKioqKi4uLi4uMjIyMi4uLi4uLi4uKioqKioqLi4uLi4yMjIuLi4uLi4uLioqKioqLi4uLi4yMjIuLi4uLi4uLi4qKioqKi4uLi4uMjIuLi4uLi4uLi4qKioqKi4uLi4uLi4uLi4uLi4uLi4qKioqKi4uLi4uLi4uLi4uLi4uLi4qKioqLi4uLi4uLi4uLi4uLi4uLioqKioqLi4uLi4uLi4uLi4uLi4qKioqKi4uLi4uLi4uLi4uLi4uKioqKioqLi4uLi4uLi4uLi4uKioqKioqLi4uLi4uLi4uLi4uKioqKioqKi4uLi4uLi4uLi4qKioqKioqLi4uLi4uLi4uLioqKioqKioqLi4uLi4uLi4uKioqKioqKiouLi4uLi4uLi4qKioqKioqKi4uLi4uLi4uKioqKioqKioqLi4uLi4uLioqKioqKioqKi4uLi4uLioqKioqKioqKioqLi4uLi4qKioqKioqKioqKi4uLi4qKioqKioqKioqKioqLi4uKioqKioqKioqKioqKi4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKg==`,

    message: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAAB/hIiLjY6PkI+OjYuJh4WDgoKCgoODhIWHiYuNjo+QkJCPjo2LiYeFg4KBgYGBgoOEhoiKjI6PkJCQj46NioiGhIKBgICAgoOFh4mLjY+QkJCQj46Mi4mGhIKBgICBgoSGiIqMjo+QkJCPj46Mi4mGhIKBgYGCg4WGiIqMjY+PkJCPj42Mi4iFg4KBgYGCg4WHiYuMjo6PkJCPj42Mi4iFg4KBgYKDhIWHiYuMjY+PkJCPjo2MioiGhIKBgYKChIWHiYuMjY+PkJCPjo2Mi4iFg4OBgYKDhIaIioyNjY+PkI+Pjo2MioiGhIKCgYKDhIaIiosMjY6Pj5CPjo2Mi4mHhYOCgYKDhIaHiYqMjY6Pj5CPjo2Mi4mHhYOCgoKDhIaHiYqLjI6Oj4+Pjo2Mi4mHhoSCgoKDhIaHiYqLjI2Ojo+Pjo2Mi4qIhoSCgoKDhIWHiImKjI2Njo6Pjo2Mi4qIhoSDgoKDhIWGiImKi4yNjY6Ojo2Mi4qJh4WDgoKDhIWGh4mKi4yNjY6OjY2Mi4qJh4aEg4KDhIWGh4mKi4yMjY2NjY2Mi4qJh4aEg4OEhIWGh4iKiosMjY2NjY2Mi4qJh4aEg4OEhYWGh4iJiosMjI2NjY2Mi4qJh4aFhIODhIWGh4iJiouMjI2NjYyMi4qJiIaFhIODhIWGh4iJiouMjIyNjYyMi4qJiIaFhISDhIWGh4iJiouMjIyNjIyMi4qJiIaFhIODhIWGh4iJiouMjIyNjIyMi4qJiIaFhIODhIWGh4iJioqMjIyMjIyLi4qJh4aFhIODhIWGh4iJiouMjIyMjIuLioqJh4aFhISDhIWGh4iJioqLjIyMi4uLioqJh4aFhIODhIWGh4iJioqLi4yMi4uLioqJiIaFhISEhIWGh4iJiYqLi4uLi4uLioqJiIaFhISEhIWGh4iJiYqLi4uLi4uLioqJiIeFhYSEhIWGh4iIiYqLi4uLi4uKioqJiIeFhYSEhIWGh4iIiYqKi4uLi4qKioqJiIeFhYSEhIWFhoiIiYqKi4uLi4qKioqJiIeGhYSEhIWFhoiIiYqKioqLi4qKiomJiIeGhYSEhIWFhoiIiYqKioqKioqKiomJiIeGhYSEhIWFhoiIiYqKioqKioqKiomJiIeGhYWEhIWFhoiIiYqKioqKioqKiomJiIeGhYWEhIWFhoiIiYmKioqKioqKiomJiIeHhYWEhIWFhoiIiYmKioqKioqKiomJiIeHhYWEhIWFhoiIiYmKioqKioqKiomJiIeHhYWEhIWFhoiIiYmJioqKioqKiomJiIeHhYWFhIWFhoiIiYmJioqKioqKiomJiIeHhYWFhIWFhoiIiYmJioqKioqKiomJiIeHhoWFhIWFhoiIiYmJioqKioqKiomJiIeHhoWFhIWFhoiIiYmJioqKioqKiomJiIeHhoWFhIWFhoiIiImJioqKioqKiomJiIeHhoWFhYWFhoiIiImJioqKioqKiomJiIeHhoWFhYWFhoiIiImJioqKioqKiomJiIeHhoaFhYWFhoiIiImJioqKioqKiomJiIeHhoaFhYWFhoiIiImJioqKioqKiomJiIiHhoaFhYWFhoiIiImJioqKioqKiomJiIiHhoaFhYWFhoiIiImJioqKioqKiomJiIiHhoaGhYWFhoiIiImJioqKioqKiomJiIiHhoaGhYWFhoaIiImJioqKioqKiomJiIiHhoaGhYWFhoaIiImJioqKioqKiomJiIiHh4aGhYWFhoaIiImJioqKioqKiomJiIiHh4aGhYWFhoaIiImJioqKioqKiomJiIiHh4aGhoWFhoaIiImJioqKioqKiomJiIiHh4aGhoWFhoaIiImJioqKioqKiomJiIiIh4aGhoWFhoaIiImJioqKioqKiomJiIiIh4aGhoaFhoaIiImJioqKioqKiomJiIiIh4aGhoaFhoaIiImJioqKioqKiomJiIiIh4aGhoaFhoaIiImJioqKioqKiomJiIiIh4aGhoaGhoaIiImJioqKioqKiomJiIiIh4eGhoaGhoaIiImJioqKioqKiomJiIiIh4eGhoaGhoaIiImJioqKioqKiomJiIiIh4eGhoaGhoaIiImJioqKioqKiomJiIiIh4eGhoaGhoaIiImJioqKioqKiomJiIg=`,

    success: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAAB/gIGDhYeJi42Ojo+QkI+OjYuJh4WDgYCAf39/gIGDhYeJi42Ojo+QkI+OjYuJh4WDgYB/f39/gIGDhYeJi42OjpCQkI+OjIqIhoSDgYB/f39/gYKEhoiKjI2Oj4+QkI+NjIqIhoOBgH9/f3+AgoSGiIqMjY6PkJCQj42MioiGhIKAgH9/f4CCg4WHiYuMjY6PkJCPjo2LiYeEgoB/f3+AgoSGiIqLjY6Oj5CQj46NioiGhIKAf3+Af4GDhYeJi4yNjo+QkJCPjYuJh4WDgYB/f4CAgYOFh4mLjI2Ojo+Qj4+OjIqIhoSCgH9/gICBg4WGiIqLjI2Ojo+Qj46NjImHhYOBgH9/gICBg4WGiIqLjI2Ojo+Pj46NioiGhIOBf3+AgIGDhYaIiYuMjY2Ojo+Pjo2LiYeGhIKAf4CAgYKEhoiJi4yNjY2Ojo6OjYuKiIaEgoCAf4CBgoSGh4mKjIyNjY2Ojo6NjIqJh4WDgoB/gICBgoSGh4mKi4yNjY6OjY2Mi4mHhoSCgICAgYGDhIaHiYqLjI2NjY2NjYyKiYeGhIKBgICAgYGDhIaHiYqLjIyNjY2NjYyKiYeGhIKBgICAgYKEhYeIiYqLjIyNjY2MjIuJiIaFg4KAgICAgoOFhoeIiouMjI2NjY2Mi4qJh4WEg4GAgIGBgoSFhoeJiouMjIyNjIyLioiHhYSCgYCAgYGCg4WGh4iKi4uMjI2MjIuKiIeGhIOBgYCBgYKDhYaHiImLi4yMjIyMi4qJiIaFg4KBgYCBgYKDhYaHiImKi4uMjIyMi4qJh4aEg4KBgYCBgYOEhYaHiYqKi4uMjIuLioiHhoSEgoGBgYGBgoOEhYaIiYqKi4uMi4uKiYiGhYSDgoGBgYGCgoOEhYaIiIqKi4uLi4uKiYeGhYSCgoGBgYGCg4OEhYeIiYmKi4uLi4qJiIeGhYSDgoGBgYGCgoOEhYaHiImKiouLi4qJiIeGhYSCgoGBgYKCg4SEhYaHiImKioqLioqJiIeGhYSCgoGBgYKCg4SEhYaHiImJioqKiomJiIeGhYSDgoGBgoKCg4SEhYaHiImJioqKiYmIh4aFhIOCgoGBgoKDg4SFhYaHiImJioqKiYmIh4aFhISDgoGBgoKDg4SEhYaHiImJioqJiYiHhoaFhIKCgoKCgoODhIWFhoeIiYmKiomJiIeGhoWEg4KCgoKCg4ODhIWFhoeHiImJiYmIh4aGhYSEg4KCgoKCg4ODhIWFhoaHiImJiYiIh4aGhYWEg4KCgoKCg4ODhIWFhoeHiImJiYiIh4eGhYWEg4KCgoKCg4OEhIWFhoaHiImJiIiHh4aGhYSEg4KCgoKDg4OEhIWFhoaHiImJiIiHh4aGhYWEg4OCgoODg4OEhIWFhoaHiImIiIiHh4aGhYWEg4OCgoODg4OEhIWFhoaHiIiIiIiHh4aGhYWEg4ODg4ODg4OEhIWFhoaHiIiIiIeHhoaGhYSEg4ODg4ODg4SEhIWFhoaHiIiIh4eHhoaGhYSEg4ODg4ODg4OEhIWFhoaHh4iIh4eHhoaGhYSEg4ODg4ODg4SEhIWFhoaGh4iIh4eHh4aGhoWEhIODg4ODg4SEhIWFhoaGh4eIh4eHh4aGhoWEhIODg4ODg4SEhIWFhoaGh4eHh4eHh4aGhoWFhIODg4ODhISEhIWFhoaGh4eHh4eHh4aGhYWEhIODg4OEhISEhYWFhoaHh4eHh4eHhoaFhYSEg4ODg4SEhISFhYaGhoaHh4eHh4eGhoaFhISEg4OEhISEhYWFhoaGh4eHh4eHhoaGhYWEhIODhISEhIWFhYaGhoaHh4eHh4aGhoWFhISEg4SEhISFhYWGhoaGh4eHh4eHhoaGhYWEhISEhISEhIWFhYaGhoaHh4eHh4aGhoaFhYSEhISEhISFhYWFhoaGhoeHh4eGhoaGhYWFhISEhISEhYWFhYaGhoaHh4eHhoaGhoWFhYSEhISEhIWFhYWGhoaGh4eHh4aGhoaFhYWEhISEhIWFhYWFhoaGhoeHh4eGhoaGhYWFhISEhISFhYWFhYaGhoaHh4eHhoaGhoaFhYWEhISEhYWFhYWGhoaGh4eHhoaGhoaFhYWEhISEhYWFhYWGhoaGh4eHhoaGhoaFhYWFhISEhYWFhYWGhoaGhoaGhoaGhoaFhYWFhISFhYWFhYWGhoaGhoaGhoaGhoWFhYWFhISFhYWFhYaGhoaGhoaGhoaGhoWFhYWFhIWFhYWFhYaGhoaGhoaGhoaGhYWFhYWFhYWFhYWFhoaGhoaGhoaGhoWFhYWFhYWFhQ==`,

    error: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACAgICAgICAgIB/f35+fX19fHx8e3t6enl5eHh4d3d3dnZ2dXV1dHR0dHNzc3NzcnJycnJxcXFxcXBwcHBwcHBwcG9vb29vb29vb29vb29wcHBwcHBwcHBxcXFxcXFxcnJycnJzc3Nzc3R0dHR0dXV1dXZ2dnd3d3h4eHl5enp6e3t8fH19fn5/f4CAgYGBgoKDg4SEhYWGhoaHh4iIiImJiYqKiouLi4yMjIyNjY2OjY6Ojo6Ojo6Ojo6Ojo6OjY2NjY2NjI2MjIyMi4uLi4uKioqKiomJiYiIiIiHh4aGhoWFhIWEg4OCgoKBgYCAgH9/fn59fX18fHt7enp5eXh4d3d2dnV1dHRzc3JycXFwcG9vbm5tbWxsa2tqamlpaGhnZ2ZmZWVkZGNjYmJhYWBgX19eXl1dXFxbW1paWllYWFdXVlZWVVVUVFRTU1NSUlFRUVBQT09OTk5NTU1MTExLS0tKSkpJSUlISEhIR0dHRkZGRkZFRUVFRUVERERERERDQ0NDRENDI0NDQ0NDQ0NDQ0NDQ0NDREREREREREVFRUVFRkZGRkZHR0dISEhISUlJSkpKS0tMTExNTU5OT09QUFFRUVJSU1NUVFVVVlZXV1hYWVlaWltbXFxdXV5eX2BgYWFiYmNjZGRlZWZmaGhpaWpra2xsbW5ub29wcHFxcnNzc3R1dXZ2d3d4eHl5enp7fHx9fX5+f4CAgYGCgoODhISFhoaHh4iIiYmKioqLi4yMjY2NjY6Ojo6Pj4+Pj4+Pj4+Oj4+Ojo6OjY2NjY2MjIyMi4uLi4qKioqJiYmIiIiHh4eGhoWFhYSEg4ODgoKBgYCAgH9/fn5+fX18fHt7e3p6eXl4eHh3d3Z2dnV1dXR0c3Nzc3JycnFxcXBwcHBvb29vb25ubm5ubm5tbW5tbm5ubm5ubm5vb29vb29wb3BwcHBwcXFxcXFycnJyc3Nzc3R0dHR1dXZ2dnd3d3h4eXl6enp7fHx9fX5+f3+AgIGBgoKDg4SEhYaGh4eIiImJioqKi4yMjI2Njo6Ojo+Pj4+QkJCQkJCQkJCQkJCPj4+Pj4+Ojo6NjY2NjIyMjIuLi4qKiomJiYiIh4eHhoaFhYSEg4OCgoGBgICAf399fXx8e3t6enl5eHh3d3Z2dXV0dHNzc3JycXFwcG9vbm5tbWxsa2tramlpaGhoZ2dmZmVlZGRjY2JiYWFgYF9fXl5dXVxcW1taWllZWFhXV1ZWVVVUVFNTUlJRUVBQT09OTk1NTExLS0pKSUlISEdHRkZFRURERENDQkJBQUBAP0A/Pz4+PT09PDw7Ozs6Ojo5OTk4ODg3Nzc2NjY1NTU0NDQ0MzMzMzIyMjIxMTExMTAwMDAwLy8vLy8vLy8vLy8vLy8vLy8vMDAwMDAwMTExMTEyMjIyMjMzMzM0NDQ0NTU1NTY2Njc3Nzg4OTk5Ojo7Ozw8PT0+Pj8/QEBAQUJCQ0NEREVFRkZHR0hISUpKS0tMTU1OT09QUVFSUVNTVFRWV1dYWVlaW1tbXV1eX19gYWFiY2RkZWZmaGhpaWpra2xtbm5vcHBxcnJzdHR1dXZ3d3h5eXp7e3x9fX5/f4CAgYGCg4OEhIWGhoeHiImJiouLjIyNjY6Ojo+PkJCQkZGRkZGRkpKSkpKSkpKSkpKSkZGRkZGRkJCQkJCPj4+Ojo6NjY2MjIyLi4uKioqJiYiIh4eGhoWFhISEg4OCgoGBgICAf39+fn19fHx7e3p6eXl4eHd3dnZ1dXR0c3NycnFxcHBvb25ubW1sbGtra2pqaWlpZ2dnZmZlZWRkZGNjYmJhYWBgX19eXl1dXFxcW1taWlpZWVhYWFdXVlZWVVVVVFRUU1NTUlJSUVFRUFBQT09PTk5OTU1NTExMTEtLS0pKSkpJSUlJSUhISEhHR0dHR0dGRkZGRkZGRkZGRkZGRkZGRkZGR0dHR0dHR0dHSEhISEhJSUlJSklKSkpKS0tLS0xMTExNTU1OTk5PT1BQUFFRUVJSU1NUVFVVVlZXV1hYWVlaWltbXFxdXV5eX19gYGFhYmNjZGRlZWZmZ2doaGlpampra2xsbW1ubm9vcHBxcXJycnNzdHR1dXZ2dnd3eHh4eXl6enp7e3t8fHx9fX1+fn5/f39/gICAQEBAQEBAQEBAQA==`,

    warning: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAAB/gIGCg4SFhoeIiImKioqLi4uLi4uLi4qKiYmIh4aFhIKBgH9+fXx7enl4d3Z1dXR0c3NycnJxcXFxcXFxcXFxcnJyc3N0dHV1dnd4eXp7fX5/gIGCg4SFhoeIiImJiYqKioqKioqKiomJiIeHhoWEg4KBf359fHp5eHd2dXR0c3JycXFwcG9vb29vb29vb29vcHBxcXJyc3R0dXZ3eHl6e3x+f4CBgoOEhYaHiIiJiYmJioqKioqKiomJiYiHhoWEg4KBf359fHp5eHd2dXR0c3JycXFwcG9vbm5ubm5ubm5vb29wcHFxcnJzdHR1dnh5ent8fX+AgYKDhIWGh4iIiYmJiYqKioqKiomJiYiHhoWEg4KAgH59fHp5eHd2dXR0c3JycXBwb29ubm5tbm5ubm5ub29vcHBxcXJyc3R1dnd4eXt8fX+AgYKDhIWGh4iIiYmJiYqKioqKiomJiIeHhoWEg4GAgH18e3p5eHd2dXR0c3JxcXBwb29ubm1tbW5ubm5ub29vcHFxcnJzdHV2d3l6e3x9f4CBgoOEhYaHiIiJiYmJioqKioqKiYmIh4aFhIOCgIB/fXx6eXh3dnV0c3NycXBwb29ubm1tbW1tbW1tbm5ub29wcXFyc3R1dnd4eXt8fX+AgYKDhIWGh4iIiYmJiYqKioqKiYmJiIeGhYSCgYB/fXx7eXh3dnV0c3JycXBwb25ubW1tbGxtbW1tbm5vb3BxcXJzdHV2d3h5e3x9f4CBgoOEhYaHiIiJiYmJioqKioqJiYiHhoWEg4GAgH99e3p5eHd2dXRzc3FxcG9vbm5tbWxsbGxsbGxtbm5vb3BxcnN0dXZ3eHl7fH1/gIGCg4SFhoeIiImJiYmKioqKiomJiIeGhYSCgYB/fXx6eXh3dnV0c3JxcXBwb25tbW1sbGxsbGxtbW5ub29wcXJzdHV2d3h5ent9f4CAgYKDhIWGh4iIiYmJiYqKioqJiYmIh4aFhIOBgH99fHp5eHd2dXRzc3FxcG9ubm1tbGxra2tra2xsbW5ub3BxcnN0dXZ3eHp7fH5/gIGCg4SFhoeIiImJiYmKioqKiYmIiIeGhYSDgYB/fXt6eXh3dnV0c3JxcHBvbm1tbGxra2tra2trb29wcXJzdHV2d3h6e3x+f4CBgoOEhYaHiIiJiYmJioqKiomJiIeHhoWEgoGAf317enl4d3Z1dHNycnFwb25tbWxra2pqampqamxtbm9wcXN0dXZ3eHp7fH5/gIGCg4SFhoeIiImJiYmKioqKiYmIh4eGhYSDgYB/fXx6eXh3dnV0c3JxcXBvbm1sbGtqamppampqam1ub3BxcnN0dXZ3eHp7fH5/gIGCg4SFhoeIiImJiYmKioqKiYmIh4aFhYSDgYB/fnx7enl4d3Z1dHNycnFwb25tbGtqamppaWlpaWprbG1ub3BxcnN0dXd4eXt8fn+AgYKDhIWGh4iIiYmJiYqKiomJiYiHhoWEg4KAf358e3p5eHd2dXRzc3JxcG9ubW1ramlpaWlpaWlqa2xtbm9wcXJzdXZ3eHp7fH5/gIGCg4SFhoeIiImJiYmKioqJiYiIh4aFhIKBgH9+fHt6eXh3dnV0c3JxcXBvbm1sa2ppaWhoaGhoaWprbG1ub3BxcnN0dnd4ent8fn+AgYKDhIWGh4iIiYmJiYqKiomJiIeHhoWEg4GAfn18e3p5eHd2dXR0c3JxcG9ubWxramloZ2dnZ2dnZ2hqamxtbm9wcXJzdXZ3eHp7fH5/gIGCg4SFhoeIiImJiYmKioqJiYiHh4aFhIOBgH9+fHt6eXh3dnV0c3JxcXBvbm1sa2ppZ2dnZmZmZ2hpa2xtbm9wcXN0dXZ3eHp7fH5/gIGCg4SFhoeIiImJiYmKioqJiYiHhoWFg4KAgH9+fHt6eXh3dnV0c3JycXBvbm1sa2ppZ2ZmZmZmZmhpamttbm9wcXJzdHZ3eHp7fH5/gIGCg4SFhoeIiImJiYmKioqJiYiHhoWEg4KAf359fHt6eXh3dnV0c3JycXBvbm1sa2lpZ2ZlZWVlZmhpa2xtbm9wcXJzdHZ3eXp7fH5/gIGCg4SFhoeIiImJiYmKiomJiYiHhoWEg4KAf39+fHt6eXh3dnV0c3JycXBvbm1samloZ2VlZWVlZmdpa2xtbm9wcXJzdHZ3eXp7fX5/gA==`,

    ticket_new: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAAB/f4CAgYGCgoODhISFhYaGh4eIiImJioqLi4yMjY2Ojo+Pj4+QkJCQkJCQkJCQj4+Pj4+Ojo6NjY2MjIyLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGAgICAgH9/f39/f39/f39/f39/f39/f39/f4CAgICAgIGBgYGCgoKCg4ODg4SEhISFhYWGhoaHh4eIiIiJiYmKioqLi4uMjIyNjY2Ojo6Pj4+Pj5CQkJCQkJCQkI+Pj4+Pjo6OjY2NjY2MjIuLi4qKioqJiYmIiIiHh4eGhoaFhYWFhISEg4ODgoKCgYGBgYCAgICAgH9/f39/f39/f39/f39/f4CAgICAgIGBgYGCgoKCg4ODhISEhYWFhoaGh4eHiIiIiYmJioqKi4uMjIyNjY2Ojo6Pj4+Pj5CQkJCQkJCQkI+Pj4+Ojo6OjY2NjYyMjIuLi4qKiomJiYmIiIiHh4eGhoaGhYWFhISDg4ODgoKCgoGBgYGAgICAgH9/f39/f39/f39/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGh4eIiIiJiYmKioqLi4uMjIyNjY2Ojo6Oj4+Pj4+QkJCQkJCPj4+Pj4+Ojo6NjY2NjIyMi4uLioqKiYmJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoKBgYGBgICAgIB/f39/f39/f39/f39/gICAgIGBgYGCgoKDg4SEhIWFhYaGhoeHiIiIiYmJioqKi4uLjIyMjY2NjY6Ojo6Pj4+Pj4+QkJCQj4+Pj4+Pjo6OjY2NjYyMjIuLi4qKiomJiYmIiIiHh4eGhoaFhYWEhISDg4ODgoKCgYGBgYGAgICAgH9/f39/f39/f39/gICAgIGBgYGCgoKDg4OEhISFhYWGhoaHh4iIiImJiYqKiouLi4yMjI2NjY2Ojo6Ojo+Pj4+Pj4+Pj4+Pj46Ojo6NjY2NjIyMi4uLioqKiYmJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGAgICAgIB/f39/f39/f3+AgICAgIGBgYKCgoODg4SEhIWFhYaGhoeHiIiIiYmJioqKi4uLjIyMjI2NjY2Ojo6Ojo6Pj4+Pj4+Pj4+Ojo6OjY2NjYyMjIuLi4qKioqJiYmIiIiHh4eGhoWFhYSEhIODg4KCgoGBgYGAgICAgIB/f39/f39/f4CAgICBgYGBgoKCg4ODhISEhYWFhoaGh4eIiIiJiYmKioqLi4uMjIyMjY2NjY6Ojo6Ojo6Ojo+Pj4+Pjo6OjY2NjYyMjIuLi4qKiomJiYiIiIeHh4eGhoWFhYSEhIODg4KCgoGBgYGAgICAgIB/f39/f39/gICAgIGBgYGCgoKDg4OEhISFhYWGhoaHh4iIiImJiYqKiouLi4yMjIyNjY2NjY6Ojo6Ojo6Ojo6Ojo6OjY2NjYyMjIuLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGAgICAgIB/f39/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWGhoaHh4iIiImJiYqKiouLi4uMjIyMjY2NjY2Ojo6OjY6Ojo6OjY2NjY2MjIyMi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYCAgICAgH9/f39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoeHiIiIiYmJioqKi4uLi4yMjIyNjY2NjY2NjY6Ojo6OjY2NjY2MjIyLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4ODgoKCgYGBgYCAgICAgH9/f39/gICAgIGBgYGCgoKDg4OEhISFhYWGhoaHh4eIiIiJiYmKioqLi4uLjIyMjI2NjY2NjY2NjY2NjY2NjIyMjIuLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoKBgYGBgICAgIB/f39/f4CAgICBgYGBgoKCg4ODhISEhYWFhoaGh4eHiIiIiYmJioqKi4uLi4yMjIyNjY2NjY2NjY2NjY2MjIyMi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYGAgICAgH9/f39/gICAgIGBgYGCgoKDg4OEhISFhYWFhoaGh4eHiIiIiYmJioqKi4uLi4yMjIyMjY2NjY2NjIyMjIuLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKCgYGBgYCAgICAgH9/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWFhoaGh4eHiIiIiYmJioqKi4uLi4uMjIyMjIyNjYyMjIyMjIuLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhYaGhoeHh4iIiImJiYqKiouLi4uLjIyMjIyMjIyMjIuLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoaHh4eIiIiJiYmKioqLi4uLi4yMjIyMjIyMi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGhoeHh4iIiImJiYqKiouLi4uLjIyMjIyMi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGhoeHh4iIiImJiYqKiouLi4uLjIyMjIuLi4uLioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoaHh4eIiIiJiYmKioqLi4uLi4yMi4uLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/fwA=`,

    ticket_update: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACAf39/f39/gICAgIGBgYGCgoKDg4OEhISFhYWGhoaHh4eIiIiJiYmKioqLi4uLi4yMjIyMjIyMjIyMi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGhoeHh4iIiImJiYqKiouLi4uLjIyMjIyMjIuLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoaHh4eIiIiJiYmKioqLi4uLi4yMjIyMjIyLi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYGAgICAgH9/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWGhoaGh4eHiIiIiYmJioqKi4uLi4uMjIyMjIyLi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYGAgICAgH9/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWGhoaGh4eHiIiIiYmJioqKi4uLi4uMjIyMjIuLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoaHh4eIiIiJiYmKioqLi4uLi4yMjIyMi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGhoeHh4iIiImJiYqKiouLi4uLjIyMjIyLi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYGAgICAgH9/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWGhoaGh4eHiIiIiYmJioqKi4uLi4uMjIyMi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGhoeHh4iIiImJiYqKiouLi4uLjIyMjIuLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoaHh4eIiIiJiYmKioqLi4uLi4yMjIyLi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYGAgICAgH9/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWGhoaGh4eHiIiIiYmJioqKi4uLi4uMjIyLi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYGAgICAgH9/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWGhoaGh4eHiIiIiYmJioqKi4uLi4uMjIyLi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYGAgICAgH9/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWGhoaGh4eHiIiIiYmJioqKi4uLi4uMjIuLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoaHh4eIiIiJiYmKioqLi4uLi4yMi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGhoeHh4iIiImJiYqKiouLi4uLjIuLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoaHh4eIiIiJiYmKioqLi4uLi4uLi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGhoeHh4iIiImJiYqKiouLi4uLi4uLi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4OCgoKBgYGBgYCAgICAf39/f4CAgICAgYGBgYKCgoODg4SEhIWFhYaGhoaHh4eIiIiJiYmKioqLi4uLi4uLi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgYGAgICAgH9/f3+AgICAgIGBgYGCgoKDg4OEhISFhYWGhoaGh4eHiIiIiYmJioqKi4uLi4uLi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gICAgICBgYGBgoKCg4ODhISEhYWFhoaGhoeHh4iIiImJiYqKiouLi4uLi4uLi4qKiomJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYGBgICAgIB/f39/gA==`,

    mention: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAAB/gIGCg4SFhoeIiYqKi4yMjY2Ojo6Pj4+Pj4+Pj4+Ojo6NjY2MjIuLioqJiYiHh4aGhYSEg4OCgoGBgICAf39/f35+fn5+fn5+fn5+fn5+f39/f4CAgIGBgYKCg4OEhIWFhoaHh4iIiYmKioqLi4yMjIyNjY2Ojo6Ojo6Ojo6NjY2NjIyMi4uKioqJiYiIh4eGhoWFhISEg4OCgoKBgYGAgIB/f39/f39/f39/f39/f39/f4CAgICBgYGCgoKDg4SEhYWGhoeHiIiJiYqKi4uLjIyMjY2NjY6Ojo6Ojo6OjY2NjYyMjIuLioqJiYmIiIeHhoaFhYSEg4ODgoKBgYGAgIB/f39/f39/f39/f39/f39/gICAgIGBgYKCgoODhISFhYaGh4eIiImJioqLi4uMjIyNjY2Njo6Ojo6OjY2NjY2MjIuLi4qKiYmIiIeHhoaFhYSEg4OCgoKBgYGAgIB/f39/f39/f39/f39/f39/gICAgICBgYGCgoKDg4SEhYWGhoeHiIiJiYqKi4uLjIyMjY2NjY2Ojo6OjY2NjYyMjIyLi4qKiYmIiIeHhoaFhYSEg4OCgoGBgYGAgIB/f39/f39/f39/f39/f3+AgICAgIGBgYKCgoODhISFhYaGh4eIiImJioqLi4uMjIyMjY2NjY2NjY2NjY2MjIyMi4uKioqJiYiIh4eGhoWFhISEg4OCgoGBgYCAgIB/f39/f39/f39/f39/f4CAgICAgYGBgoKCg4OEhIWFhoaHh4iIiYmKioqLi4yMjIyNjY2NjY2NjY2NjIyMjIuLioqKiYmIiIeHhoaFhYSEg4OCgoKBgYGAgIB/f39/f39/f39/f39/f4CAgICAgYGBgoKCg4OEhIWFhoaHh4iIiYmKioqLi4yMjIyMjY2NjY2NjY2NjIyMi4uLioqJiYiIh4eGhoWFhISEg4OCgoGBgYCAgIB/f39/f39/f39/f39/f4CAgICAgYGBgoKCg4OEhIWFhoaHh4iIiYmKioqLi4yMjIyMjY2NjY2NjY2MjIyLi4uKioqJiYiIh4eGhoWFhISEg4OCgoGBgYCAgIB/f39/f39/f39/f39/gICAgICAgYGBgoKCg4OEhIWFhoaHh4iIiYmKioqLi4uMjIyMjI2NjY2NjY2MjIyLi4uKioqJiYiIh4eGhoWFhISEg4OCgoGBgYCAgIB/f39/f39/f39/f39/gICAgICAgYGBgoKCg4OEhIWFhoaHh4iIiYmKioqLi4uMjIyMjIyNjY2NjYyMjIyLi4uKioqJiYiIh4eGhoWFhISEg4OCgoGBgYCAgH9/f39/f39/f39/f3+AgICAgICBgYGCgoKDg4SEhYWGhoeHiIiJiYqKiouLi4yMjIyMjI2NjY2MjIyMi4uLioqKiYmIiIeHhoaFhYSEhIODgoKBgYGAgIB/f39/f39/f39/f39/gICAgICAf4GBgYKCgoODhISFhYaGh4eIiImJioqKi4uLjIyMjIyMjIyMjIyMjIuLi4qKiomJiIiHh4aGhYWEhISDg4KCgYGBgICAf39/f39/f39/f39/f4CAgICAgH+BgYGCgoKDg4SEhYWGhoeHiIiJiYqKiouLi4yMjIyMjIyMjIyMi4uLi4qKiomJiIiHh4aGhYWEhISDg4KCgYGBgICAf39/f39/f39/f39/f4CAgICAf3+BgYGCgoKDg4SEhYWGhoeHiIiJiYqKiouLi4yMjIyMjIyMjIyLi4uLioqKiYmIiIeHhoaFhYSEhIODgoKBgYGAgIB/f39/f39/f39/f39/gICAgIB/f4GBgYKCgoODhISFhYaGh4eIiImJioqKi4uLjIyMjIyMjIyMi4uLi4uKioqJiYiIh4eGhoWFhISEg4OCgoGBgYCAgH9/f39/f39/f39/f3+AgICAgH9/gYGBgoKCg4OEhIWFhoaHh4iIiYmKioqLi4uMjIyMjIyMjIuLi4uLioqKiYmIiIeHhoaFhYSEhIODgoKBgYGAgIB/f39/f39/f39/f39/gICAgIB/f4GBgYKCgoODhISFhYaGh4eIiImJioqKi4uLjIyMjIyMjIuLi4uLioqKiYmIiIeHhoaFhYSEhIODgoKBgYGAgIB/f39/f39/f39/f39/gICAgIB/f4GBgYKCgoODhISFhYaGh4eIiImJioqKi4uLjIyMjIyMi4uLi4uKioqJiYiIh4eGhoWFhISEg4OCgoGBgYCAgH9/f39/f39/f39/f3+AgICAgH9/gYGBgoKCg4OEhIWFhoaHh4iIiYmKioqLi4uMjIyMjIyLi4uLi4qKiomJiIiHh4aGhYWEhISDg4KCgYGBgICAf39/f39/f39/f39/f4CAgIB/f3+BgYGCgoKDg4SEhYWGhoeHiIiJiYqKiouLi4yMjIyMi4uLi4uKioqJiYiIh4eGhoWFhISEg4OCgoGBgQ==`
};

// ==================== إدارة الإعدادات ====================

/**
 * الحصول على إعدادات الصوت
 */
export const getSoundSettings = (): SoundSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
};

/**
 * حفظ إعدادات الصوت
 */
export const saveSoundSettings = (settings: Partial<SoundSettings>): void => {
    try {
        const current = getSoundSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Error saving sound settings:', error);
    }
};

/**
 * كتم الصوت لفترة
 */
export const muteFor = (minutes: number): void => {
    const muteUntil = new Date();
    muteUntil.setMinutes(muteUntil.getMinutes() + minutes);
    saveSoundSettings({ muteUntil: muteUntil.toISOString() });
};

/**
 * إلغاء الكتم
 */
export const unmute = (): void => {
    saveSoundSettings({ muteUntil: undefined });
};

/**
 * التحقق من حالة الكتم
 */
export const isMuted = (): boolean => {
    const settings = getSoundSettings();
    if (!settings.enabled) return true;
    if (settings.muteUntil && new Date(settings.muteUntil) > new Date()) return true;
    return false;
};

// ==================== تشغيل الأصوات ====================

/**
 * تشغيل صوت
 */
export const playSound = async (type: SoundType): Promise<void> => {
    const settings = getSoundSettings();

    // التحقق من تفعيل الأصوات
    if (!settings.enabled || isMuted()) return;
    if (!settings.sounds[type]) return;

    try {
        const audio = new Audio(SOUNDS[type]);
        audio.volume = settings.volume;
        await audio.play();
    } catch (error) {
        console.warn('Could not play sound:', error);
    }
};

/**
 * تشغيل صوت إشعار
 */
export const playNotificationSound = () => playSound('notification');

/**
 * تشغيل صوت رسالة
 */
export const playMessageSound = () => playSound('message');

/**
 * تشغيل صوت نجاح
 */
export const playSuccessSound = () => playSound('success');

/**
 * تشغيل صوت خطأ
 */
export const playErrorSound = () => playSound('error');

/**
 * تشغيل صوت تحذير
 */
export const playWarningSound = () => playSound('warning');

// ==================== مكونات React ====================

interface SoundSettingsPanelProps {
    onClose?: () => void;
}

export const SoundSettingsPanel: React.FC<SoundSettingsPanelProps> = ({ onClose }) => {
    const [settings, setSettings] = useState(getSoundSettings());

    const handleUpdate = (updates: Partial<SoundSettings>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        saveSoundSettings(newSettings);
    };

    const handleToggleSound = (type: SoundType) => {
        const newSounds = { ...settings.sounds, [type]: !settings.sounds[type] };
        handleUpdate({ sounds: newSounds });
    };

    const handleTestSound = (type: SoundType) => {
        const audio = new Audio(SOUNDS[type]);
        audio.volume = settings.volume;
        audio.play();
    };

    const soundLabels: Record<SoundType, string> = {
        notification: 'الإشعارات العامة',
        message: 'الرسائل الجديدة',
        success: 'العمليات الناجحة',
        error: 'الأخطاء',
        warning: 'التحذيرات',
        ticket_new: 'تذكرة جديدة',
        ticket_update: 'تحديث تذكرة',
        mention: 'الإشارات'
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">إعدادات الصوت</h3>
                {onClose && (
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        ✕
                    </button>
                )}
            </div>

            {/* تفعيل/إلغاء الأصوات */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="font-medium text-gray-800 dark:text-white">تفعيل الأصوات</span>
                <button
                    onClick={() => handleUpdate({ enabled: !settings.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* مستوى الصوت */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    مستوى الصوت: {Math.round(settings.volume * 100)}%
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.volume}
                    onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                    disabled={!settings.enabled}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
            </div>

            {/* أنواع الأصوات */}
            <div className="space-y-3">
                <h4 className="font-medium text-gray-800 dark:text-white mb-3">أنواع الأصوات</h4>
                {(Object.keys(soundLabels) as SoundType[]).map(type => (
                    <div
                        key={type}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                        <span className="text-gray-700 dark:text-gray-300">{soundLabels[type]}</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleTestSound(type)}
                                disabled={!settings.enabled}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg disabled:opacity-50"
                                title="تشغيل"
                            >
                                🔊
                            </button>
                            <button
                                onClick={() => handleToggleSound(type)}
                                disabled={!settings.enabled}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${settings.sounds[type] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.sounds[type] ? 'translate-x-5' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* أزرار الكتم السريع */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-white mb-3">كتم سريع</h4>
                <div className="flex gap-2">
                    {[15, 30, 60, 120].map(mins => (
                        <button
                            key={mins}
                            onClick={() => muteFor(mins)}
                            className="flex-1 py-2 px-3 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {mins < 60 ? `${mins} دقيقة` : `${mins / 60} ساعة`}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==================== Hook للاستخدام ====================
export const useNotificationSounds = () => {
    const settings = getSoundSettings();

    const play = useCallback((type: SoundType) => {
        playSound(type);
    }, []);

    return {
        play,
        playNotification: () => play('notification'),
        playMessage: () => play('message'),
        playSuccess: () => play('success'),
        playError: () => play('error'),
        playWarning: () => play('warning'),
        isEnabled: settings.enabled && !isMuted(),
        settings
    };
};
