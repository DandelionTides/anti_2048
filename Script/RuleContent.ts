export interface RuleSection {
  title: string;
  body: string;
  /** Expected wrapped lines on the 620-unit mobile rules column. */
  lines: number;
}

export const RULE_SECTIONS: RuleSection[] = [
  { title: "拆解", body: "有初始空位时，2→1+1、4→2+2；1→0+0并消失。", lines: 2 },
  { title: "顺序", body: "每次有效滑动依次执行：空位快照与拆解、数字沿路径由近到远触发符号、同类合成、最终压缩。", lines: 2 },
  { title: "保护", body: "本次刚拆出的数字块不能立即普通合成，但仍可触发运算符；饼干是唯一会阻挡它的块。", lines: 2 },
  { title: "满盘", body: "滑动开始无空位时跳过拆解，但仍可移动或合成。", lines: 2 },
  { title: "难度模式生成", body: "不额外生成普通数字；默认每 2 次有效滑动，从 ÷n、×n、√、饼干中随机生成一个。", lines: 2 },
  { title: "除法与乘法", body: "÷n 会向下整除，×n 会放大数字；两者触发一次即消失。同值 ÷n 或同值 ×n 可以合成，异类不合成。", lines: 3 },
  { title: "根号", body: "√ 为一次性块。结果向下取到不超过平方根的最大 2 的幂，例如 √32→4。", lines: 2 },
  { title: "饼干", body: "饼干在下一次滑动后必定消失。刚拆出的数字撞到它会停下，并让之后 3 次有效滑动的拆解得分 ×2。", lines: 3 },
  { title: "无尽模式", body: "每次有效滑动只随机生成 1 块：数字或运算符。数字的大数概率与上限随步数缓慢提升，乘除参数池保持固定。", lines: 3 },
  { title: "撤销", body: "恢复到上次有效滑动前；计时不回退，最多保留 10 步。", lines: 2 },
  { title: "计分", body: "成功拆解获得拆解前数字值；合成不加分。", lines: 1 },
];
