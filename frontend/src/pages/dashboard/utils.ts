export function formatCount(value: number, lang: 'en' | 'zh'): string {
  return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US').format(value);
}

export function statusTone(status: string): string {
  switch (status) {
    case 'active':
    case 'ready':
    case 'in_progress':
      return 'border-accent-cyan/20 bg-accent-cyan/8 text-accent-cyan';
    case 'awaiting_review':
    case 'awaiting_feedback':
      return 'border-accent-amber/20 bg-accent-amber/8 text-accent-amber';
    case 'completed':
      return 'border-white/10 bg-white/5 text-white';
    default:
      return 'border-accent-mag/20 bg-accent-mag/8 text-accent-mag';
  }
}
