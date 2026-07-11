/**
 * 香水香调表(离线查询用,约 90 款国内常见款)。
 * 映射规则(香调 → 五行,与引擎 outfitAdvisor 的 scentFamilies 对齐):
 *   柑橘/绿叶/草本/茶香/无花果 → 木    辛香/东方琥珀/甜暖/烟草/玫瑰 → 火
 *   檀香/广藿/大地/皮革/沉香   → 土    醛香/白花/鸢尾/皂感/清透麝香 → 金
 *   海洋/水生/薄荷/冷冽        → 水
 * 香调数据为公开常识性归纳;查不到的款让用户自选五行香调存入个人库。
 * 搜索按中文名/英文名子串匹配(小写)。
 */
module.exports = [
  // ── 祖玛珑 Jo Malone ──
  { n: '祖玛珑 英国梨与小苍兰', en: 'jo malone english pear freesia', wx: ['木'], f: '果香绿意' },
  { n: '祖玛珑 蓝风铃', en: 'jo malone wild bluebell', wx: ['水', '木'], f: '花香水生' },
  { n: '祖玛珑 鼠尾草与海盐', en: 'jo malone wood sage sea salt', wx: ['水'], f: '海洋芳香' },
  { n: '祖玛珑 青柠罗勒与柑橘', en: 'jo malone lime basil mandarin', wx: ['木'], f: '柑橘芳香' },
  { n: '祖玛珑 牡丹与胭红麂绒', en: 'jo malone peony blush suede', wx: ['火'], f: '花香果香' },
  { n: '祖玛珑 黑石榴', en: 'jo malone pomegranate noir', wx: ['火'], f: '辛香果香' },
  { n: '祖玛珑 乌木与佛手柑', en: 'jo malone oud bergamot', wx: ['土'], f: '木质沉香' },
  { n: '祖玛珑 橙花', en: 'jo malone orange blossom', wx: ['金'], f: '白花' },
  { n: '祖玛珑 红玫瑰', en: 'jo malone red roses', wx: ['火'], f: '玫瑰' },
  // ── 香奈儿 Chanel ──
  { n: '香奈儿 五号', en: 'chanel no.5', wx: ['金'], f: '醛香花香' },
  { n: '香奈儿 蔚蓝', en: 'chanel bleu', wx: ['木', '土'], f: '柑橘木质' },
  { n: '香奈儿 邂逅', en: 'chanel chance', wx: ['木', '金'], f: '绿意花香' },
  { n: '香奈儿 粉色邂逅', en: 'chanel chance tendre', wx: ['火'], f: '花果甜香' },
  { n: '香奈儿 COCO小姐', en: 'chanel coco mademoiselle', wx: ['火'], f: '东方花香' },
  { n: '香奈儿 嘉柏丽尔', en: 'chanel gabrielle', wx: ['金'], f: '白花' },
  // ── 迪奥 Dior ──
  { n: '迪奥 旷野', en: 'dior sauvage', wx: ['火', '木'], f: '辛香馥奇' },
  { n: '迪奥 真我', en: 'dior j adore', wx: ['金'], f: '花香' },
  { n: '迪奥 花漾甜心', en: 'dior miss dior blooming', wx: ['火', '金'], f: '粉嫩花香' },
  { n: '迪奥 桀骜', en: 'dior homme', wx: ['金', '土'], f: '鸢尾木质' },
  { n: '迪奥 沙丘', en: 'dior dune', wx: ['水', '土'], f: '海洋大地' },
  // ── 爱马仕 Hermès ──
  { n: '爱马仕 大地', en: 'hermes terre', wx: ['土', '木'], f: '矿物木质柑橘' },
  { n: '爱马仕 尼罗河花园', en: 'hermes jardin sur le nil', wx: ['木'], f: '青绿柑橘' },
  { n: '爱马仕 屋顶花园', en: 'hermes jardin sur le toit', wx: ['木'], f: '青苹果草木' },
  { n: '爱马仕 橘绿之泉', en: 'hermes eau d orange verte', wx: ['木'], f: '柑橘绿意' },
  // ── 圣罗兰 YSL ──
  { n: '圣罗兰 黑鸦片', en: 'ysl black opium', wx: ['火', '土'], f: '咖啡香草' },
  { n: '圣罗兰 自由至上', en: 'ysl libre', wx: ['金', '木'], f: '薰衣草橙花' },
  { n: '圣罗兰 反转巴黎', en: 'ysl mon paris', wx: ['火'], f: '果香甜' },
  // ── 汤姆福特 Tom Ford ──
  { n: '汤姆福特 乌木沉香', en: 'tom ford oud wood', wx: ['土'], f: '沉香木质' },
  { n: '汤姆福特 烟叶香草', en: 'tom ford tobacco vanille', wx: ['火'], f: '烟草甜香' },
  { n: '汤姆福特 荒漠孤魂', en: 'tom ford ombre leather', wx: ['土', '火'], f: '皮革' },
  { n: '汤姆福特 灰色香根草', en: 'tom ford grey vetiver', wx: ['土'], f: '香根草' },
  { n: '汤姆福特 迷失樱桃', en: 'tom ford lost cherry', wx: ['火'], f: '樱桃甜香' },
  // ── 勒拉博 Le Labo ──
  { n: '勒拉博 檀香33', en: 'le labo santal 33', wx: ['土'], f: '木质皮革' },
  { n: '勒拉博 别样13', en: 'le labo another 13', wx: ['金'], f: '清透麝香' },
  { n: '勒拉博 玫瑰31', en: 'le labo rose 31', wx: ['火'], f: '玫瑰辛香' },
  // ── 柏芮朵 Byredo ──
  { n: '柏芮朵 无人区玫瑰', en: 'byredo rose of no man s land', wx: ['火'], f: '玫瑰' },
  { n: '柏芮朵 超级雪松', en: 'byredo super cedar', wx: ['木'], f: '雪松' },
  { n: '柏芮朵 吉普赛之水', en: 'byredo gypsy water', wx: ['木', '土'], f: '青苔木质' },
  { n: '柏芮朵 莫哈韦幽魂', en: 'byredo mojave ghost', wx: ['金'], f: '轻盈花木' },
  // ── 蒂普提克 Diptyque ──
  { n: '蒂普提克 杜桑', en: 'diptyque do son', wx: ['金'], f: '晚香玉白花' },
  { n: '蒂普提克 感官之水', en: 'diptyque philosykos', wx: ['木'], f: '无花果' },
  { n: '蒂普提克 谭道', en: 'diptyque tam dao', wx: ['土'], f: '檀香' },
  { n: '蒂普提克 影中之水', en: 'diptyque ombre dans l eau', wx: ['木', '火'], f: '绿意玫瑰' },
  // ── 梅森马吉拉 REPLICA ──
  { n: '马吉拉 慵懒周末', en: 'margiela lazy sunday morning', wx: ['金'], f: '白花皂感' },
  { n: '马吉拉 壁炉火光', en: 'margiela by the fireplace', wx: ['火', '土'], f: '烟熏甜栗' },
  { n: '马吉拉 航行日记', en: 'margiela sailing day', wx: ['水'], f: '海洋' },
  { n: '马吉拉 泡泡浴', en: 'margiela bubble bath', wx: ['金'], f: '皂感' },
  { n: '马吉拉 爵士酒廊', en: 'margiela jazz club', wx: ['火', '土'], f: '烟草朗姆' },
  { n: '马吉拉 花市', en: 'margiela flower market', wx: ['木'], f: '绿意花香' },
  // ── 娇兰 / 兰蔻 ──
  { n: '娇兰 一千零一夜', en: 'guerlain shalimar', wx: ['火'], f: '东方香草' },
  { n: '娇兰 小黑裙', en: 'guerlain la petite robe noire', wx: ['火'], f: '樱桃甜香' },
  { n: '娇兰 帝王之水', en: 'guerlain eau imperiale', wx: ['木'], f: '柑橘古龙' },
  { n: '娇兰 蓝调时光', en: 'guerlain l heure bleue', wx: ['金'], f: '鸢尾粉感' },
  { n: '兰蔻 奇迹', en: 'lancome miracle', wx: ['金'], f: '清透花香' },
  { n: '兰蔻 美丽人生', en: 'lancome la vie est belle', wx: ['火', '土'], f: '鸢尾甜香' },
  // ── 信仰 Creed / 欧珑 ──
  { n: '信仰 银色山泉', en: 'creed silver mountain water', wx: ['水', '木'], f: '冷冽绿意' },
  { n: '信仰 拿破仑之水', en: 'creed aventus', wx: ['木', '火'], f: '果木烟熏' },
  { n: '信仰 爱尔兰绿花呢', en: 'creed green irish tweed', wx: ['木'], f: '青草绿意' },
  { n: '欧珑 赤霞橘光', en: 'atelier cologne orange sanguine', wx: ['木'], f: '血橙柑橘' },
  { n: '欧珑 无极乌龙', en: 'atelier cologne oolang infini', wx: ['木'], f: '茶香' },
  // ── 芦丹氏 / 阿蒂仙 ──
  { n: '芦丹氏 柏林少女', en: 'serge lutens la fille de berlin', wx: ['火'], f: '玫瑰' },
  { n: '芦丹氏 林之妩媚', en: 'serge lutens fille en aiguilles', wx: ['木'], f: '松针蜜饯' },
  { n: '阿蒂仙 冥府之路', en: 'l artisan passage d enfer', wx: ['水', '金'], f: '冷焚香白花' },
  // ── 三宅一生 / 大牌水生 ──
  { n: '三宅一生 一生之水男士', en: 'issey miyake l eau d issey homme', wx: ['水'], f: '水生' },
  { n: '三宅一生 一生之水女士', en: 'issey miyake l eau d issey', wx: ['水', '金'], f: '水生花香' },
  { n: '大卫杜夫 冷水', en: 'davidoff cool water', wx: ['水'], f: '海洋' },
  { n: '阿玛尼 寄情水男士', en: 'armani acqua di gio', wx: ['水'], f: '海洋' },
  { n: '范思哲 云淡风轻', en: 'versace dylan turquoise', wx: ['水'], f: '柑橘水生' },
  { n: '杜嘉班纳 浅蓝', en: 'dolce gabbana light blue', wx: ['木', '水'], f: '柑橘苹果海洋' },
  // ── 宝格丽 / 其他大牌 ──
  { n: '宝格丽 大吉岭茶', en: 'bvlgari pour homme', wx: ['水', '木'], f: '清冷茶香' },
  { n: '宝格丽 白茶', en: 'bvlgari eau parfumee au the blanc', wx: ['金', '木'], f: '清淡茶香' },
  { n: '古驰 花悦', en: 'gucci bloom', wx: ['金'], f: '晚香玉白花' },
  { n: '普拉达 蔓陀绿', en: 'prada infusion d iris', wx: ['金'], f: '鸢尾' },
  { n: '缪缪 首款同名', en: 'miu miu eau de parfum', wx: ['金'], f: '铃兰绿意' },
  { n: '博柏利 她', en: 'burberry her', wx: ['火'], f: '莓果甜香' },
  { n: '凯利安 别羞涩', en: 'kilian love don t be shy', wx: ['火'], f: '橙花棉花糖甜' },
  { n: 'MFK 540', en: 'mfk baccarat rouge 540', wx: ['火', '土'], f: '琥珀番红花' },
  { n: 'MFK 致玫瑰', en: 'mfk a la rose', wx: ['火'], f: '玫瑰' },
  { n: 'MFK 宇宙之水', en: 'mfk aqua universalis', wx: ['金'], f: '清透白花' },
  { n: '罗意威 事后清晨', en: 'loewe 001 woman', wx: ['金'], f: '清晨麝香' },
  { n: '蔻依 同名', en: 'chloe eau de parfum', wx: ['金'], f: '玫瑰皂感' },
  { n: '莫杰 雏菊', en: 'marc jacobs daisy', wx: ['木'], f: '青绿花香' },
  { n: '纳西索 for her', en: 'narciso rodriguez for her', wx: ['金'], f: '麝香' },
  { n: 'CK ONE', en: 'ck one', wx: ['木'], f: '柑橘清新' },
  { n: '4711 古龙水', en: '4711 kolnisch wasser', wx: ['木'], f: '柑橘古龙' },
  { n: 'SMN 皇后之水', en: 'santa maria novella acqua della regina', wx: ['木'], f: '柑橘草本' },
  // ── 国牌 ──
  { n: '观夏 昆仑煮雪', en: 'to summer kunlun snow', wx: ['水', '木'], f: '冷冽松雪' },
  { n: '观夏 颐和金桂', en: 'to summer osmanthus', wx: ['金', '土'], f: '桂花' },
  { n: '观夏 书院莲池', en: 'to summer lotus', wx: ['水'], f: '荷叶水生' },
  { n: '气味图书馆 凉白开', en: 'scent library liangbaikai', wx: ['水'], f: '清水感' },
];
