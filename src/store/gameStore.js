import { writable } from 'svelte/store';
import { createSudoku, createGame } from '../domain/index.js';

// 保留这个空壳，防止网页刚加载时白屏崩溃
const emptyGrid = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
];

export function createGameStore() {
    let sudoku = createSudoku(emptyGrid);
    let game = createGame({ sudoku });

    // 计算冲突地图的辅助函数
    function getConflictsMap() {
        const grid = game.getSudoku().getGrid();
        return grid.map((row, r) => row.map((_, c) => game.getSudoku().isConflict(r, c)));
    }

    // 1. 初始化时，带上 conflicts
    const { subscribe, set } = writable({
        grid: game.getSudoku().getGrid(),
        conflicts: getConflictsMap(), // 初始化错误地图
        canUndo: game.canUndo(),
        canRedo: game.canRedo()
    });

    //每次有动作时，更新 conflicts
    function notifyUpdate() {
        set({
            grid: game.getSudoku().getGrid(),
            conflicts: getConflictsMap(), // 更新错误地图
            canUndo: game.canUndo(),
            canRedo: game.canRedo()
        });
    }

    return {
        //对外暴露的API
        subscribe,
        guess: (row, col, value) => {
            game.guess({ row, col, value });
            notifyUpdate(); 
        },
        undo: () => {
            if (game.canUndo()) {
                game.undo();
                notifyUpdate();
            }
        },
        redo: () => {
            if (game.canRedo()) {
                game.redo();
                notifyUpdate();
            }
        },
        initNewGame: (realGrid) => {
            sudoku = createSudoku(realGrid);
            game = createGame({ sudoku });
            notifyUpdate();
        },
    };

}

// 导出全局单例
export const gameStore = createGameStore();