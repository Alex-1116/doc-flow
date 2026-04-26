import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Session } from '@/store/useChatStore';

/**
 * 打字机 Hook，负责管理单个会话项的标题动画逻辑。
 * 它内部保存了自己会话的状态，避免每次跳动引起全局重渲染。
 */
export function useSessionTypewriter(sessions: Session[]) {
  const [animatedTitles, setAnimatedTitles] = useState<Record<string, string>>({});
  const prevSessionsRef = useRef<Record<string, { title: string; messageCount: number }>>({});
  const timersRef = useRef<Record<string, number[]>>({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timers) => {
        timers.forEach((timer) => window.clearTimeout(timer));
      });
    };
  }, []);

  useLayoutEffect(() => {
    const previousSessions = prevSessionsRef.current;

    sessions.forEach((session) => {
      const previous = previousSessions[session.id];
      const shouldAnimate =
        previous &&
        previous.title === '新对话' &&
        previous.messageCount === 0 &&
        session.title !== '新对话' &&
        session.messages.length > 0;

      if (!shouldAnimate || timersRef.current[session.id]) {
        return;
      }

      // 闪烁光标效果
      setAnimatedTitles((current) => ({ ...current, [session.id]: '新对话' }));

      const startTypingTimer = window.setTimeout(() => {
        let index = 0;
        const targetTitle = session.title;

        const typingTimer = window.setInterval(() => {
          index += 1;
          const nextTitle = targetTitle.slice(0, index);

          setAnimatedTitles((current) => {
            if (index >= targetTitle.length) {
              const { [session.id]: _, ...rest } = current;
              return rest;
            }

            return { ...current, [session.id]: nextTitle };
          });

          if (index >= targetTitle.length) {
            window.clearInterval(typingTimer);
            delete timersRef.current[session.id];
          }
        }, 45);

        timersRef.current[session.id] = [startTypingTimer, typingTimer];
      }, 220);

      timersRef.current[session.id] = [startTypingTimer];
    });

    prevSessionsRef.current = Object.fromEntries(
      sessions.map((session) => [
        session.id,
        { title: session.title, messageCount: session.messages.length },
      ])
    );
  }, [sessions]);

  return animatedTitles;
}
