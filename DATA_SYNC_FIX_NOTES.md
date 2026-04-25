# Data Sync Fix Notes

## Problem

首页个人信息区展示的是全局 `store.$state.user` 中的成长数据。用户完成词汇学习或对战后，数据库中的词力值、总局数、胜利次数可能已经更新，但返回首页时首页没有主动重新拉取最新用户数据，导致个人信息区仍展示旧缓存。

## Root Cause

- 首页 `pages/home/home.ts` 只有空的 `onLoad`，没有在 `onShow` 中刷新用户信息。
- 首页个人信息组件读取 `$state.user.experience`、`$state.user.totalGames`、`$state.user.winGames`，依赖全局 store 当前值。
- 学习和对战结算已经通过 `userModel.incExperience()` 写入用户表，但结算后没有统一从数据库重新校准 store。
- 字段本身没有发现混用：当前项目使用 `experience` 作为词力值，`totalGames` 作为总局数，`winGames` 作为胜利次数。

## Files Changed

| File | Change | Logic Changed |
| --- | --- | --- |
| `miniprogram/utils/helper.ts` | 新增 `refreshUserInfo()`，通过 `userModel.login()` 拉取云端用户数据并同步到全局 store | Yes |
| `miniprogram/pages/home/home.ts` | 新增 `onShow` 刷新用户信息，返回首页时重新拉取数据库最终值 | Yes |
| `miniprogram/pages/learning/components/problem/problem.ts` | 学习结算写入词力值成功后，本地同步并触发云端刷新校准 | Yes |
| `miniprogram/pages/combat/components/settleScene/settleScene.ts` | 对战结算写入词力值、总局数、胜利次数成功后，本地同步并触发云端刷新校准 | Yes |

## Fix Details

### 首页刷新逻辑

- 新增 `refreshUserInfo(source)` 作为统一刷新入口。
- 首页 `onShow` 等待登录完成后调用 `refreshUserInfo('home.onShow')`。
- 刷新成功后更新 `store.user` 和当前选中 `book`，个人信息组件会继续通过 `$state.user` 自动展示最新值。

### 学习完成后的用户数据更新逻辑

- 词汇学习结算时继续使用现有 `userModel.incExperience(experience, false, 'learning')`。
- 数据库更新成功后，先把 `experience` 同步到本地 store，并清空本轮待结算 `learning.experience`。
- 随后调用 `refreshUserInfo('learning.finish')`，用数据库最终值校准首页展示数据。

### 对战结束后的用户数据更新逻辑

- 对战结算继续使用现有 `userModel.incExperience(incExperience, isWin)`。
- `userModel.incExperience()` 对对战使用原子自增：
  - `experience: _.inc(incExperience)`
  - `totalGames: _.inc(1)`
  - `winGames: _.inc(isWin ? 1 : 0)`
- 数据库更新成功后，本地 store 先同步 `experience / totalGames / winGames`，然后调用 `refreshUserInfo('combat.settle')` 从数据库校准。
- 如果数据库更新失败，只输出警告，不再把失败数据写入本地 store。

### 本地缓存 / globalData 同步逻辑

- 当前项目使用 `wxministore` 的 `store` 作为页面共享状态，本次没有新增 `wx.setStorageSync('userInfo')`，避免引入第二套用户缓存。
- 数据库仍是最终真实来源，首页显示时会重新同步到全局 store。

### 云函数或数据库更新逻辑

- 未修改云函数。
- 未修改数据库字段结构。
- 未修改核心学习、对战、统计和路由逻辑。
- 继续沿用用户表字段：`experience`、`totalGames`、`winGames`。

## Verification

- 已执行 `git diff --check`，结果通过，没有发现新增空白错误。
- 已执行 `npm run lint`，但当前环境缺少本地 `eslint` 可执行文件，命令失败：`sh: eslint: command not found`。
- 尝试执行 `npm install --ignore-scripts` 恢复依赖，但 npm 自身报错：`Exit handler never called!`，未能完成依赖安装。
- 需要在依赖正常安装的环境中再次执行 `npm run lint`。
- 需要在微信开发者工具中检查：
  - 首页返回时是否触发 `[user-sync] refreshed user info home.onShow`。
  - 词汇学习结算后返回首页，`experience` 是否立即更新。
  - 对战结算后返回首页，`experience / totalGames / winGames` 是否立即更新。
  - 胜利时 `winGames` 增加，失败时只增加 `totalGames`。

## Rollback

```bash
git log --oneline
git revert <本次修复相关 commit>
```

如果当前工作区还未提交，也可以恢复本次修改文件：

```bash
git restore miniprogram/utils/helper.ts \
  miniprogram/pages/home/home.ts \
  miniprogram/pages/learning/components/problem/problem.ts \
  miniprogram/pages/combat/components/settleScene/settleScene.ts \
  DATA_SYNC_FIX_NOTES.md
```
