/** `pets` namespace dictionaries: pet panel and settings section copy. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'pets'

/** The pets dictionary key set (the source of truth for both locales). */
export type PetsKey =
  | 'view.click.hint'
  | 'view.facts.label'
  | 'view.action.favorite'
  | 'view.action.unfavorite'
  | 'view.favorites.title'
  | 'view.favorites.empty'
  | 'view.favorites.remove'
  | 'view.error.retry'
  | 'view.error.upstream'
  | 'view.segment.all'
  | 'view.segment.cat'
  | 'view.segment.dog'
  | 'view.segment.fox'
  | 'view.breed.any'
  | 'view.action.shuffle'
  | 'view.action.say'
  | 'view.action.sayPlaceholder'
  | 'widget.aria'
  | 'settings.nav'
  | 'settings.widget.enable'
  | 'settings.widget.enableHint'
  | 'settings.sources.title'
  | 'settings.sources.cat'
  | 'settings.sources.dog'
  | 'settings.sources.fox'
  | 'settings.sources.facts'
  | 'settings.breed.title'
  | 'settings.facts.enable'
  | 'settings.interval.title'
  | 'settings.interval.off'
  | 'settings.interval.5min'
  | 'settings.interval.30min'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The pet-corner panel and settings section copy. */
    'pets': PetsKey
  }
}

/** Simplified Chinese dictionary. */
export const zh: Record<PetsKey, string> = {
  'view.click.hint': '点击图片换一只猫猫',
  'view.facts.label': '💬 猫语角',
  'view.action.favorite': '☆ 收藏',
  'view.action.unfavorite': '★ 已收藏',
  'view.favorites.title': '我的收藏',
  'view.favorites.empty': '还没有收藏，点 ☆ 把喜欢的猫猫收进来吧～',
  'view.favorites.remove': '右键删除',
  'view.error.retry': '重试',
  'view.error.upstream': '猫猫源开小差了',
  'view.segment.all': '全部',
  'view.segment.cat': '猫猫',
  'view.segment.dog': '狗狗',
  'view.segment.fox': '狐狸',
  'view.breed.any': '随机品种',
  'view.action.shuffle': '换一张',
  'view.action.say': '让猫猫说话',
  'view.action.sayPlaceholder': '让猫猫说点什么…',
  'widget.aria': '摸鱼角宠物',
  'settings.nav': '宠物角',
  'settings.widget.enable': '宠物挂件',
  'settings.widget.enableHint': '在右下角常驻一只猫咪宠物，点击它看猫图（可拖拽，双击隐藏）',
  'settings.sources.title': '图片来源',
  'settings.sources.cat': '猫图',
  'settings.sources.dog': '狗图',
  'settings.sources.fox': '狐狸图',
  'settings.sources.facts': '猫咪知识',
  'settings.breed.title': '默认狗狗品种',
  'settings.facts.enable': '猫语角（随图刷新）',
  'settings.interval.title': '自动换图间隔',
  'settings.interval.off': '关闭',
  'settings.interval.5min': '每 5 分钟',
  'settings.interval.30min': '每 30 分钟',
}

/** English dictionary. */
export const en: Record<PetsKey, string> = {
  'view.click.hint': 'Click the picture for a new cat',
  'view.facts.label': '💬 Cat Facts',
  'view.action.favorite': '☆ Favorite',
  'view.action.unfavorite': '★ Favorited',
  'view.favorites.title': 'My favorites',
  'view.favorites.empty': 'Nothing here yet — tap ☆ to keep a cat.',
  'view.favorites.remove': 'Right-click to remove',
  'view.error.retry': 'Retry',
  'view.error.upstream': 'The cat source is having a nap',
  'view.segment.all': 'All',
  'view.segment.cat': 'Cats',
  'view.segment.dog': 'Dogs',
  'view.segment.fox': 'Foxes',
  'view.breed.any': 'Any breed',
  'view.action.shuffle': 'Shuffle',
  'view.action.say': 'Make the cat speak',
  'view.action.sayPlaceholder': 'What should the cat say?',
  'widget.aria': 'Pet Corner pet',
  'settings.nav': 'Pet Corner',
  'settings.widget.enable': 'Pet widget',
  'settings.widget.enableHint': 'Keep a pet cat in the bottom-right corner; click it for pictures (draggable, double-click hides)',
  'settings.sources.title': 'Picture sources',
  'settings.sources.cat': 'Cats',
  'settings.sources.dog': 'Dogs',
  'settings.sources.fox': 'Foxes',
  'settings.sources.facts': 'Cat facts',
  'settings.breed.title': 'Default dog breed',
  'settings.facts.enable': 'Cat facts (refresh with each picture)',
  'settings.interval.title': 'Auto refresh',
  'settings.interval.off': 'Off',
  'settings.interval.5min': 'Every 5 minutes',
  'settings.interval.30min': 'Every 30 minutes',
}
