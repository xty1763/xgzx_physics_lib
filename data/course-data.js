/*
 * 高中物理教学资源库 —— 教材与章节定义
 * 人教版（2019）普通高中教科书，共 6 册。
 * 结构：book → chapter → section。
 * 需要扩充/修改时，直接改这个文件即可（保持 id 唯一）。
 */
window.COURSE = {
  subject: "高中物理（人教版 2019）",
  // 资源类型分类（可在此新增/修改；试卷不计入小节，见下方资源说明）
  resourceTypes: ["练习", "试卷", "课件", "教案", "仿真资源"],
  books: [
    {
      id: "b1",
      title: "必修第一册",
      chapters: [
        {
          id: "b1c1",
          title: "第一章 运动的描述",
          sections: [
            { id: "b1c1s1", title: "1.1 质点 参考系" },
            { id: "b1c1s2", title: "1.2 时间 位移" },
            { id: "b1c1s3", title: "1.3 位置变化快慢的描述——速度" },
            { id: "b1c1s4", title: "1.4 速度变化快慢的描述——加速度" }
          ]
        },
        {
          id: "b1c2",
          title: "第二章 匀变速直线运动的研究",
          sections: [
            { id: "b1c2s1", title: "2.1 实验：探究小车速度随时间变化的规律" },
            { id: "b1c2s2", title: "2.2 匀变速直线运动的速度与时间的关系" },
            { id: "b1c2s3", title: "2.3 匀变速直线运动的位移与时间的关系" },
            { id: "b1c2s4", title: "2.4 自由落体运动" }
          ]
        },
        {
          id: "b1c3",
          title: "第三章 相互作用——力",
          sections: [
            { id: "b1c3s1", title: "3.1 重力与弹力" },
            { id: "b1c3s2", title: "3.2 摩擦力" },
            { id: "b1c3s3", title: "3.3 牛顿第三定律" },
            { id: "b1c3s4", title: "3.4 力的合成和分解" },
            { id: "b1c3s5", title: "3.5 共点力的平衡" }
          ]
        },
        {
          id: "b1c4",
          title: "第四章 运动和力的关系",
          sections: [
            { id: "b1c4s1", title: "4.1 牛顿第一定律" },
            { id: "b1c4s2", title: "4.2 实验：探究加速度与力、质量的关系" },
            { id: "b1c4s3", title: "4.3 牛顿第二定律" },
            { id: "b1c4s4", title: "4.4 力学单位制" },
            { id: "b1c4s5", title: "4.5 牛顿运动定律的应用" },
            { id: "b1c4s6", title: "4.6 超重和失重" }
          ]
        }
      ]
    },
    {
      id: "b2",
      title: "必修第二册",
      chapters: [
        {
          id: "b2c1",
          title: "第五章 抛体运动",
          sections: [
            { id: "b2c1s1", title: "5.1 曲线运动" },
            { id: "b2c1s2", title: "5.2 运动的合成与分解" },
            { id: "b2c1s3", title: "5.3 实验：探究平抛运动的特点" },
            { id: "b2c1s4", title: "5.4 抛体运动的规律" }
          ]
        },
        {
          id: "b2c2",
          title: "第六章 圆周运动",
          sections: [
            { id: "b2c2s1", title: "6.1 圆周运动" },
            { id: "b2c2s2", title: "6.2 向心力" },
            { id: "b2c2s3", title: "6.3 向心加速度" },
            { id: "b2c2s4", title: "6.4 生活中的圆周运动" }
          ]
        },
        {
          id: "b2c3",
          title: "第七章 万有引力与宇宙航行",
          sections: [
            { id: "b2c3s1", title: "7.1 行星的运动" },
            { id: "b2c3s2", title: "7.2 万有引力定律" },
            { id: "b2c3s3", title: "7.3 万有引力理论的成就" },
            { id: "b2c3s4", title: "7.4 宇宙航行" },
            { id: "b2c3s5", title: "7.5 相对论时空观与牛顿力学的局限性" }
          ]
        },
        {
          id: "b2c4",
          title: "第八章 机械能守恒定律",
          sections: [
            { id: "b2c4s1", title: "8.1 功与功率" },
            { id: "b2c4s2", title: "8.2 重力势能" },
            { id: "b2c4s3", title: "8.3 动能和动能定理" },
            { id: "b2c4s4", title: "8.4 机械能守恒定律" },
            { id: "b2c4s5", title: "8.5 实验：验证机械能守恒定律" }
          ]
        }
      ]
    },
    {
      id: "b3",
      title: "必修第三册",
      chapters: [
        {
          id: "b3c1",
          title: "第九章 静电场及其应用",
          sections: [
            { id: "b3c1s1", title: "9.1 电荷" },
            { id: "b3c1s2", title: "9.2 库仑定律" },
            { id: "b3c1s3", title: "9.3 电场 电场强度" },
            { id: "b3c1s4", title: "9.4 静电的防止和利用" }
          ]
        },
        {
          id: "b3c2",
          title: "第十章 静电场中的能量",
          sections: [
            { id: "b3c2s1", title: "10.1 电势能和电势" },
            { id: "b3c2s2", title: "10.2 电势差" },
            { id: "b3c2s3", title: "10.3 电势差与电场强度的关系" },
            { id: "b3c2s4", title: "10.4 电容器的电容" },
            { id: "b3c2s5", title: "10.5 带电粒子在电场中的运动" }
          ]
        },
        {
          id: "b3c3",
          title: "第十一章 电路及其应用",
          sections: [
            { id: "b3c3s1", title: "11.1 电源和电流" },
            { id: "b3c3s2", title: "11.2 导体的电阻" },
            { id: "b3c3s3", title: "11.3 实验：导体电阻率的测量" },
            { id: "b3c3s4", title: "11.4 串联电路和并联电路" },
            { id: "b3c3s5", title: "11.5 实验：练习使用多用电表" }
          ]
        },
        {
          id: "b3c4",
          title: "第十二章 电能 能量守恒定律",
          sections: [
            { id: "b3c4s1", title: "12.1 电路中的能量转化" },
            { id: "b3c4s2", title: "12.2 闭合电路的欧姆定律" },
            { id: "b3c4s3", title: "12.3 实验：电池电动势和内阻的测量" },
            { id: "b3c4s4", title: "12.4 能源与可持续发展" }
          ]
        },
        {
          id: "b3c5",
          title: "第十三章 电磁感应与电磁波初步",
          sections: [
            { id: "b3c5s1", title: "13.1 磁场 磁感线" },
            { id: "b3c5s2", title: "13.2 磁感应强度 磁通量" },
            { id: "b3c5s3", title: "13.3 电磁感应现象及应用" },
            { id: "b3c5s4", title: "13.4 电磁波的产生及应用" },
            { id: "b3c5s5", title: "13.5 能量量子化" }
          ]
        }
      ]
    },
    {
      id: "b4",
      title: "选择性必修第一册",
      chapters: [
        {
          id: "b4c1",
          title: "第一章 动量守恒定律",
          sections: [
            { id: "b4c1s1", title: "1.1 动量" },
            { id: "b4c1s2", title: "1.2 动量定理" },
            { id: "b4c1s3", title: "1.3 动量守恒定律" },
            { id: "b4c1s4", title: "1.4 实验：验证动量守恒定律" }
          ]
        },
        {
          id: "b4c2",
          title: "第二章 机械振动",
          sections: [
            { id: "b4c2s1", title: "2.1 简谐运动" },
            { id: "b4c2s2", title: "2.2 简谐运动的描述" },
            { id: "b4c2s3", title: "2.3 简谐运动的回复力和能量" },
            { id: "b4c2s4", title: "2.4 单摆" },
            { id: "b4c2s5", title: "2.5 实验：用单摆测定重力加速度" },
            { id: "b4c2s6", title: "2.6 受迫振动 共振" }
          ]
        },
        {
          id: "b4c3",
          title: "第三章 机械波",
          sections: [
            { id: "b4c3s1", title: "3.1 波的形成" },
            { id: "b4c3s2", title: "3.2 波的描述" },
            { id: "b4c3s3", title: "3.3 波的反射、折射和衍射" },
            { id: "b4c3s4", title: "3.4 波的干涉" },
            { id: "b4c3s5", title: "3.5 多普勒效应" }
          ]
        },
        {
          id: "b4c4",
          title: "第四章 光及其应用",
          sections: [
            { id: "b4c4s1", title: "4.1 光的折射" },
            { id: "b4c4s2", title: "4.2 全反射" },
            { id: "b4c4s3", title: "4.3 光的干涉" },
            { id: "b4c4s4", title: "4.4 实验：用双缝干涉测量光的波长" },
            { id: "b4c4s5", title: "4.5 光的衍射" },
            { id: "b4c4s6", title: "4.6 光的偏振 激光" }
          ]
        }
      ]
    },
    {
      id: "b5",
      title: "选择性必修第二册",
      chapters: [
        {
          id: "b5c1",
          title: "第一章 安培力与洛伦兹力",
          sections: [
            { id: "b5c1s1", title: "1.1 磁场对通电导线的作用力" },
            { id: "b5c1s2", title: "1.2 磁场对运动电荷的作用力" },
            { id: "b5c1s3", title: "1.3 带电粒子在匀强磁场中的运动" },
            { id: "b5c1s4", title: "1.4 质谱仪与回旋加速器" }
          ]
        },
        {
          id: "b5c2",
          title: "第二章 电磁感应",
          sections: [
            { id: "b5c2s1", title: "2.1 楞次定律" },
            { id: "b5c2s2", title: "2.2 法拉第电磁感应定律" },
            { id: "b5c2s3", title: "2.3 涡流、电磁阻尼和电磁驱动" },
            { id: "b5c2s4", title: "2.4 互感和自感" }
          ]
        },
        {
          id: "b5c3",
          title: "第三章 交变电流",
          sections: [
            { id: "b5c3s1", title: "3.1 交变电流" },
            { id: "b5c3s2", title: "3.2 交变电流的描述" },
            { id: "b5c3s3", title: "3.3 变压器" },
            { id: "b5c3s4", title: "3.4 电能的输送" }
          ]
        },
        {
          id: "b5c4",
          title: "第四章 电磁振荡与电磁波",
          sections: [
            { id: "b5c4s1", title: "4.1 电磁振荡" },
            { id: "b5c4s2", title: "4.2 电磁场与电磁波" },
            { id: "b5c4s3", title: "4.3 无线电波的发射和接收" },
            { id: "b5c4s4", title: "4.4 电磁波谱" }
          ]
        },
        {
          id: "b5c5",
          title: "第五章 传感器",
          sections: [
            { id: "b5c5s1", title: "5.1 认识传感器" },
            { id: "b5c5s2", title: "5.2 常见传感器的工作原理及应用" }
          ]
        }
      ]
    },
    {
      id: "b6",
      title: "选择性必修第三册",
      chapters: [
        {
          id: "b6c1",
          title: "第一章 分子动理论",
          sections: [
            { id: "b6c1s1", title: "1.1 分子动理论的基本内容" },
            { id: "b6c1s2", title: "1.2 实验：用油膜法估测油酸分子的大小" },
            { id: "b6c1s3", title: "1.3 分子运动速率分布规律" },
            { id: "b6c1s4", title: "1.4 分子动能和分子势能" }
          ]
        },
        {
          id: "b6c2",
          title: "第二章 气体、固体和液体",
          sections: [
            { id: "b6c2s1", title: "2.1 温度和温标" },
            { id: "b6c2s2", title: "2.2 气体的等温变化" },
            { id: "b6c2s3", title: "2.3 气体的等压变化和等容变化" },
            { id: "b6c2s4", title: "2.4 固体" },
            { id: "b6c2s5", title: "2.5 液体" }
          ]
        },
        {
          id: "b6c3",
          title: "第三章 热力学定律",
          sections: [
            { id: "b6c3s1", title: "3.1 功、热和内能" },
            { id: "b6c3s2", title: "3.2 热力学第一定律" },
            { id: "b6c3s3", title: "3.3 能量守恒定律" },
            { id: "b6c3s4", title: "3.4 热力学第二定律" }
          ]
        },
        {
          id: "b6c4",
          title: "第四章 原子结构和波粒二象性",
          sections: [
            { id: "b6c4s1", title: "4.1 光电效应" },
            { id: "b6c4s2", title: "4.2 光电效应方程" },
            { id: "b6c4s3", title: "4.3 原子的核式结构模型" },
            { id: "b6c4s4", title: "4.4 氢原子光谱和玻尔的原子模型" },
            { id: "b6c4s5", title: "4.5 粒子的波动性和量子力学的建立" }
          ]
        },
        {
          id: "b6c5",
          title: "第五章 原子核",
          sections: [
            { id: "b6c5s1", title: "5.1 原子核的组成" },
            { id: "b6c5s2", title: "5.2 放射性元素的衰变" },
            { id: "b6c5s3", title: "5.3 核力与结合能" },
            { id: "b6c5s4", title: "5.4 核裂变与核聚变" }
          ]
        }
      ]
    }
  ]
};
