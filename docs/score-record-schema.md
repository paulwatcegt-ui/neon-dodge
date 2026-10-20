# 无限生存成绩协议（本地实现，服务端预留）

当前可试玩规则标识为 `balance-2.0.0`，见 `src/config/difficulty.js`。八敌种、弹速、主动脉冲改变公平性，因此与原无限版隔离。`gameVersion`表示规则版本；后续改变难度和计分须升级它并使用独立榜单。画质、模型朝向、音量和减少动态不影响规则。

```json
{
  "schemaVersion": 2,
  "gameVersion": "balance-2.0.0",
  "mode": "standard",
  "runId": "2b1e1eb0-046b-4b5a-a2c4-d22c1bfb226a",
  "seed": 1001,
  "score": 7280,
  "survivalTicks": 18060,
  "survivalSeconds": 301,
  "perfectDodges": 17,
  "grazes": 30,
  "maxCombo": 12
}
```

- `standard`是固定曲线标准挑战，`practice`是自适应练习。按`(gameVersion, mode)`隔离。生存时间以60Hz整数tick为准，秒数由tick推导，不信任外部提供的浮点秒数。
- `runId`来自浏览器`crypto.randomUUID()`，种子来自`crypto.getRandomValues()`的32位无符号值；重开和更换模式生成新标识。模拟不读取墙钟，同种子、模式、规则版本与输入序列可重现。
- 只在三格生命耗尽时提交本地结果。暂停、失焦、复位、切模式均不保存未完成成绩。同一个world对象只处理一次；前10名中已有的runId不再次插入，刷新重载也校验ID。
- 本地键按规则版本命名：`neon-dodge.records.v2.${RULES_VERSION}`，当前为`neon-dodge.records.v2.balance-2.0.0`，外层仍是`{schemaVersion:2, boards:{standard:[],practice:[]}}`。每榜最多10条，按分数降序、生存tick降序、完美次数降序、ID字典序排序。读取校验整数、模式、版本、ID格式、种子范围，剔除重复/无效记录；存储失败降级到内存。`list()`返回副本，UI用`textContent`渲染。
- 原有限时版`neon-dodge.records.v1`与原无限版`neon-dodge.records.v2`均不删除、不覆盖，也不导入新平衡榜。当前只展示本规则版本，未来跨版本历史可单独读取各规则键；不得跨版本合榜。

## 后续 Workers + D1 接口边界

本轮没有创建Worker、数据库、账号、网络接口或自动上报。可将上述单条记录作为后续API的数据基础，D1以`runId`唯一约束实现持久幂等，查询按版本和模式分区建立索引，服务端统一校验排序规则并限制提交频率。

客户端localStorage和成绩字段都能被用户修改，**当前记录不是可信全球排行榜证据**。正式上线前需要服务端签发对局标识/种子、校验规则版本及完成条件、限制重复提交，并评估输入重放或服务端复算；不能仅把本地JSON直接当作可信成绩。匿名公开榜还需单独设计展示名和内容限制。当前榜单没有姓名或个人信息字段。
