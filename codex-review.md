# con-oo-TINSR - Review

## Review 结论

当前实现已经有了 `Sudoku`/`Game` 和 Svelte store adapter 的基本雏形，棋盘主渲染与撤销/重做也开始接到领域层；但领域对象还没有成为真实唯一核心。输入、提示、胜利判定和开局生命周期仍明显分散在旧 store/旧 game 流程中，因此从作业要求看，只完成了“部分接入”，设计质量也存在较明显的双状态源问题。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. Sudoku 只暴露裸写入，未建模固定题面与合法落子约束

- 严重程度：core
- 位置：src/domain/index.js:14-18
- 原因：`guess(move)` 直接改 `grid[row][col]`，没有校验坐标范围、数字范围、固定题面不可改等数独核心规则。当前“题面数字不能改”实际上依赖 UI 侧旧 store 的禁用逻辑来兜底，业务不变量没有被领域对象自己守住，不符合 OOP 和数独业务建模。

### 2. 同一输入流程同时写旧 store 和新领域 store，形成双状态源

- 严重程度：core
- 位置：src/components/Controls/Keyboard.svelte:12-25
- 原因：备注模式走 `userGrid.set(...)`，普通输入走 `gameStore.guess(...)`。同一个“用户输入”被拆成两套状态模型：棋盘主渲染来自 `$gameStore.grid`，而 notes/candidates 相关副作用仍留在旧 `userGrid` 体系，状态一旦分叉，后续显示和业务判断就不再可靠。

### 3. Hint 流程绕过 Game/Sudoku，且不进入撤销历史

- 严重程度：core
- 位置：src/components/Controls/ActionBar/Actions.svelte:18-24
- 原因：`handleHint()` 直接调用 `userGrid.applyHint($cursor)`，没有经过 `gameStore`/`Game`。这样提示填入不会记录到领域历史里，`undo/redo` 无法覆盖该操作；同时棋盘主渲染又来自 `$gameStore.grid`，提示结果与主状态存在脱节风险。

### 4. 胜利判定仍绑定旧状态，领域对象无法闭环驱动游戏结束

- 严重程度：core
- 位置：src/App.svelte:13-17
- 原因：游戏结束依赖旧的 `gameWon` store，而当前手动填数主要更新的是 `gameStore`。这意味着“填满且无冲突就结束游戏”的关键业务没有真正建立在 `Game/Sudoku` 之上，领域对象不能独立驱动完整游戏流程。

### 5. 领域对象只是被动镜像旧 `grid`，开局流程的所有权仍在旧模块

- 严重程度：major
- 位置：src/App.svelte:35-39
- 原因：新局/载入题目的真正入口仍是旧的 `@sudoku/game` 与 `grid` store；`gameStore` 只是等 `$grid` 变化后再复制一份进领域对象。这样 `Game` 不是游戏生命周期的 owner，更像是旧流程旁边的一层镜像适配，距离“View 真正消费领域对象”还有明显差距。

### 6. 大量依赖 JSON 深拷贝，不符合常见 JS 领域建模习惯

- 严重程度：minor
- 位置：src/domain/index.js:6-11
- 原因：`constructor()` 和 `getGrid()` 都通过 `JSON.parse(JSON.stringify(...))` 复制状态。它只适用于当前这种全是数字的二维数组，做法脆弱，也掩盖了真正的快照边界与不可变策略设计；一旦状态稍微复杂，序列化语义就会出问题。

### 7. 遗留的全局单例与同步函数未参与当前接入，增加设计噪音

- 严重程度：minor
- 位置：src/domain/index.js:142-162
- 原因：`globalGameInstance`、`getGameInstance()`、`updateGridFromGame()` 没有形成当前 Svelte 接入路径中的稳定职责，反而暴露出第二套未完成的集成思路，增加理解和维护成本。

## 优点

### 1. 使用 custom store 作为领域对象的 Svelte 适配层

- 位置：src/store/gameStore.js:17-69
- 原因：`createGameStore()` 通过 `subscribe + guess/undo/redo/initNewGame` 暴露响应式状态和命令，方向上符合作业推荐的 Store Adapter 方案，组件不必直接拿 `Game` 实例做细节操作。

### 2. Undo/Redo 的分支截断语义基本正确

- 位置：src/domain/index.js:72-98
- 原因：在撤销后重新落子时会先裁掉未来历史，再写入新快照；`undo/redo` 也通过克隆恢复状态，这比把历史逻辑散落在组件里更接近领域层职责。

### 3. 棋盘主渲染已经开始消费领域导出的响应式状态

- 位置：src/components/Board/index.svelte:42-55
- 原因：格子值与冲突高亮来自 `$gameStore.grid`/`$gameStore.conflicts`，说明最核心的 board view 已经部分摆脱了直接渲染旧 `userGrid` 的方式。

### 4. 提供了基础的序列化与恢复入口

- 位置：src/domain/index.js:109-139
- 原因：`Sudoku` 和 `Game` 都有 `toJSON`/恢复工厂，为后续存档、持久化和测试构造留出了可扩展接口。

## 补充说明

- 本次结论完全基于对 `src/domain/*`、`src/store/gameStore.js` 以及相关 `.svelte` 接入代码的静态阅读得出，未运行测试，也未实际操作界面。
- 关于提示、胜利判定、开局 ownership、双状态源等结论，来自当前组件对 `gameStore` 与旧 starter store 的调用关系静态推断。
- 审查范围按要求聚焦 `src/domain/*` 及其关联的 Svelte 接入代码，没有扩展评价无关目录。
