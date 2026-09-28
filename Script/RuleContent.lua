local ____exports = {}
____exports.RULE_SECTIONS = {
    {title = "拆解", body = "有初始空位时，2→1+1、4→2+2；1→0+0并消失。", lines = 2},
    {title = "顺序", body = "每次有效滑动依次执行：空位快照与拆解、移动和除法触发、数字/Divider 合成、最终压缩。", lines = 2},
    {title = "保护", body = "本次刚拆出的数字块不能立即普通合成，但仍可以触发 Divider。", lines = 2},
    {title = "满盘", body = "滑动开始无空位时跳过拆解，但仍可移动或合成。", lines = 2},
    {title = "数字生成", body = "难度模式不额外随机生成普通数字；默认每 2 次有效滑动生成一个 Divider。", lines = 2},
    {title = "Divider", body = "数字沿滑动方向撞到 ÷n 时会变为整数 value÷n，Divider 立即消失；小于 1 的结果按 0 处理。相邻同值 Divider 可合成为更大的 Divider。", lines = 3},
    {title = "无尽模式", body = "每次有效滑动补充一个 NUMBER；步数越高，大数字出现概率与最大数值越高。每 2 步先生成 Divider，再生成 NUMBER。", lines = 3},
    {title = "撤销", body = "恢复到上次有效滑动前；计时不回退，最多保留 10 步。", lines = 2},
    {title = "计分", body = "成功拆解获得拆解前数字值；合成不加分。", lines = 1}
}
return ____exports
