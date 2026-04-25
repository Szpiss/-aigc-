import { Router } from 'wxapp-router'
import type { Route } from 'wxapp-router/build/main/lib/route'

const router = new Router()

export const routesConfig = [
  { path: '/home', route: '/pages/home/home' },
  { path: '/learning', route: '/pages/learning/learning' },
  { path: '/combat', route: '/pages/combat/combat' },
  { path: '/review', route: '/pages/review/review' },
  { path: '/combatSelect', route: '/pages/combatSelect/combatSelect' },
  { path: '/statistics', route: '/pages/statistics/statistics' },
  { path: '/ranking', route: '/pages/ranking/ranking' },
  { path: '/setting', route: '/pages/setting/setting' },
  { path: '/about', route: '/pages/about/about' },
  // 添加AIGC页面路由配置
  { path: '/aigc', route: '/pages/aigc/aigc' }
]

export interface ICombatRoute {
  type: 'friend' | 'random' | 'npc'
  state?: 'create' | 'ready' | 'start'

  /** 上一局对战的房间 id，通过对战结束后的「再来一局」创建的房间将携带 */
  previousId?: string | DB.DocumentId

  /** 房间 id，分享邀请好友时使用 */
  id?: string | DB.DocumentId

  /** 调试状态 (对战页有些场景在用户侧是无法直接进入的，通过路由参数强制进入需要加上 debug 参数) */
  debug?: string

  /** 是否为分享结果，用于对战结束后的分享战绩标识 */
  share_result?: string
}

// AIGC页面路由参数接口（如果需要传递参数）
export interface IAIGCRoute {
  // 可以添加AIGC页面需要的参数，如：
  // from?: string  // 记录来源页面
}

export interface IRoutes {
  pages: {
    /** 首页 */
    home: Route<{}>
    /** 词汇学习 */
    learning: Route<{}>
    /** 生词本 */
    review: Route<{}>
    /** 对战模式 */
    combat: Route<ICombatRoute>
    /** 对战选择 */
    combatSelect: Route<{}>
    /** 排行榜 */
    ranking: Route<{}>
    /** 数据看板 */
    statistics: Route<{}>
    /** 设置页 */
    setting: Route<{}>
    /** 关于 */
    about: Route<{}>
    /** AIGC英语学习助手 */
    aigc: Route<IAIGCRoute>  // 添加AIGC路由类型定义
  }
}

router.batchRegister(routesConfig)

export default router
