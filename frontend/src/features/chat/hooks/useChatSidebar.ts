import { useMemo, useState } from 'react';
import { Session } from '@/store/useChatStore';

export function useChatSidebar(sessions: Session[]) {
  const [searchQuery, setSearchQuery] = useState('');

  // 对会话进行分组
  const groupedSessions = useMemo(() => {
    // 过滤：
    // 1. 过滤掉标题不匹配搜索词的会话
    // 2. 过滤掉空的“新对话”（标题为“新对话”且没有消息的会话不应出现在历史列表中）
    const filtered = sessions.filter((session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(session.title === '新对话' && session.messages.length === 0)
    );

    // 按照时间降序排序
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const groups: Record<string, typeof sessions> = {
      '今日': [],
      '七日内': [],
      '一个月内': [],
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    sorted.forEach(session => {
      const time = new Date(session.updatedAt).getTime();
      const dateObj = new Date(session.updatedAt);
      
      // YYYY-MM-DD 格式
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (time >= todayStart) {
        groups['今日'].push(session);
      } else if (time >= sevenDaysAgo) {
        groups['七日内'].push(session);
      } else if (time >= thirtyDaysAgo) {
        groups['一个月内'].push(session);
      } else {
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        groups[dateStr].push(session);
      }
    });

    const result: { label: string; sessions: typeof sessions }[] = [];
    if (groups['今日'].length > 0) result.push({ label: '今日', sessions: groups['今日'] });
    if (groups['七日内'].length > 0) result.push({ label: '七日内', sessions: groups['七日内'] });
    if (groups['一个月内'].length > 0) result.push({ label: '一个月内', sessions: groups['一个月内'] });

    // 其他具体日期的分组
    const olderDates = Object.keys(groups)
      .filter(k => k !== '今日' && k !== '七日内' && k !== '一个月内')
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    olderDates.forEach(date => {
      if (groups[date].length > 0) {
        result.push({ label: date, sessions: groups[date] });
      }
    });

    return result;
  }, [sessions, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    groupedSessions,
  };
}
