/* 人教版 6 册教材 · 章 · 节（带课时/难点/目标/核心概念/公式）—— 取自物理界面1.html 设计稿 */
window.PEP_TEXTBOOKS = [
      {
        id: "bx1",
        name: "必修第一册",
        shortName: "必修一",
        grade: "高一上学期",
        color: "#38bdf8",
        chapters: [
          {
            id: "bx1_c1",
            code: "第一章",
            title: "运动的描述",
            desc: "建立质点、参考系、位移、速度与加速度等质点运动学基本物理观念",
            sections: [
              {
                id: "bx1_c1_s1",
                code: "第1节",
                title: "质点 参考系",
                pageRange: "P.2 - P.8",
                hours: "1课时",
                difficulty: "基础",
                target: "理解质点的概念及其建立过程，掌握物体视为质点的条件；明确参考系在描述运动中的作用。",
                keyConcepts: ["理想化模型", "质点条件", "参考系相对性"],
                formulas: ["Δx = x₂ - x₁"]
              },
              {
                id: "bx1_c1_s2",
                code: "第2节",
                title: "时间 位移",
                pageRange: "P.9 - P.14",
                hours: "1课时",
                difficulty: "基础",
                target: "区分时刻与时间间隔，理解位置、位移和路程的关系；掌握矢量与标量的运算差异。",
                keyConcepts: ["时刻与时间", "位移与路程", "矢量与标量", "坐标系"],
                formulas: ["s ≥ |Δx|", "Δt = t₂ - t₁"]
              },
              {
                id: "bx1_c1_s3",
                code: "第3节",
                title: "位置变化快慢——速度",
                pageRange: "P.15 - P.22",
                hours: "2课时",
                difficulty: "重点",
                target: "理解平均速度与瞬时速度的物理意义与极限思想；学会利用打点计时器/传感器测定瞬时速度。",
                keyConcepts: ["平均速度", "瞬时速度", "速率", "v-t图像", "打点计时器"],
                formulas: ["v̄ = Δx/Δt", "v = lim(Δt→0) Δx/Δt"]
              },
              {
                id: "bx1_c1_s4",
                code: "第4节",
                title: "速度变化快慢——加速度",
                pageRange: "P.23 - P.31",
                hours: "2课时",
                difficulty: "难点",
                target: "深刻理解加速度是描述速度变化快慢的物理量；掌握加速度方向与速度变化量方向的一致性。",
                keyConcepts: ["速度变化量Δv", "加速度定义", "加速与减速判据", "矢量方向"],
                formulas: ["a = (v - v₀)/Δt", "Δv = v₂ - v₁"]
              }
            ]
          },
          {
            id: "bx1_c2",
            code: "第二章",
            title: "匀变速直线运动的研究",
            desc: "掌握匀变速直线运动规律、v-t图像分析方法及自由落体运动",
            sections: [
              {
                id: "bx1_c2_s1",
                code: "第1节",
                title: "实验：探究小车速度随时间变化的规律",
                pageRange: "P.34 - P.40",
                hours: "2课时",
                difficulty: "实验",
                target: "通过打点计时器采集纸带数据，掌握逐差法与v-t图像斜率法求解加速度。",
                keyConcepts: ["实验数据处理", "逐差法", "v-t图像拟合", "误差分析"],
                formulas: ["a = (x₄+x₅+x₆ - x₁-x₂-x₃) / 9T²", "v_n = (x_n + x_{n+1}) / 2T"]
              },
              {
                id: "bx1_c2_s2",
                code: "第2节",
                title: "匀变速直线运动的速度与时间的关系",
                pageRange: "P.41 - P.46",
                hours: "1课时",
                difficulty: "重点",
                target: "推导并掌握匀变速直线运动的速度公式，能够结合实际交通刹车情景熟练求解。",
                keyConcepts: ["速度公式", "斜率物理意义", "刹车安全问题"],
                formulas: ["v = v₀ + at"]
              },
              {
                id: "bx1_c2_s3",
                code: "第3节",
                title: "匀变速直线运动的位移与时间的关系",
                pageRange: "P.47 - P.53",
                hours: "2课时",
                difficulty: "重点",
                target: "运用微元累加思想推导位移公式及导出公式，掌握逆向思维法与平均速度法。",
                keyConcepts: ["微元法", "面积法求位移", "导出公式", "比例推论"],
                formulas: ["x = v₀t + ½at²", "v² - v₀² = 2ax", "x = (v₀ + v)t / 2"]
              },
              {
                id: "bx1_c2_s4",
                code: "第4节",
                title: "自由落体运动",
                pageRange: "P.54 - P.61",
                hours: "2课时",
                difficulty: "探究",
                target: "探究自由落体运动性质，测定重力加速度g，领会伽利略科学探究方法。",
                keyConcepts: ["自由落体", "重力加速度g", "频闪摄影", "反应时间测定"],
                formulas: ["v = gt", "h = ½gt²", "v² = 2gh"]
              }
            ]
          },
          {
            id: "bx1_c3",
            code: "第三章",
            title: "相互作用——力",
            desc: "重力、弹力（胡克定律）、摩擦力及共点力平衡与力的合成与分解",
            sections: [
              {
                id: "bx1_c3_s1",
                code: "第1节",
                title: "重力与弹力",
                pageRange: "P.64 - P.71",
                hours: "2课时",
                difficulty: "重点",
                target: "认识重力、重心与支持力、拉力的形变本质，实验探究胡克定律并掌握弹性限度。",
                keyConcepts: ["重力与重心", "微小形变", "弹力方向", "胡克定律"],
                formulas: ["G = mg", "F = kx"]
              },
              {
                id: "bx1_c3_s2",
                code: "第2节",
                title: "摩擦力",
                pageRange: "P.72 - P.78",
                hours: "2课时",
                difficulty: "难点",
                target: "区分静摩擦力与滑动摩擦力，理解最大静摩擦力与正压力的关系及摩擦力做功特性。",
                keyConcepts: ["静摩擦力", "最大静摩擦力", "滑动摩擦力", "动摩擦因数μ"],
                formulas: ["f_滑 = μN", "0 ≤ f_静 ≤ f_max"]
              },
              {
                id: "bx1_c3_s3",
                code: "第3节",
                title: "牛顿第三定律",
                pageRange: "P.79 - P.84",
                hours: "1课时",
                difficulty: "基础",
                target: "借助力传感器探究作用力与反作用力的同生共灭性，明确作用力反作用力与平衡力的本质区别。",
                keyConcepts: ["作用力与反作用力", "同生共灭", "性质相同", "相互作用"],
                formulas: ["F = -F'"]
              },
              {
                id: "bx1_c3_s4",
                code: "第4节",
                title: "力的合成和分解",
                pageRange: "P.85 - P.92",
                hours: "2课时",
                difficulty: "重点",
                target: "掌握平行四边形定则与正交分解法，理解等效替代的物理思想。",
                keyConcepts: ["等效替代", "平行四边形定则", "正交分解", "三角形定则"],
                formulas: ["F_合 = √(F₁² + F₂² + 2F₁F₂cosθ)", "F_x = Fcosθ, F_y = Fsinθ"]
              },
              {
                id: "bx1_c3_s5",
                code: "第5节",
                title: "共点力的平衡",
                pageRange: "P.93 - P.98",
                hours: "2课时",
                difficulty: "高考热点",
                target: "掌握共点力作用下物体的平衡条件，熟练运用合成法、分解法、动态三角形法解决受力分析问题。",
                keyConcepts: ["平衡状态", "合外力为零", "动态平衡", "相似三角形法"],
                formulas: ["∑F_x = 0, ∑F_y = 0", "F_合 = 0"]
              }
            ]
          },
          {
            id: "bx1_c4",
            code: "第四章",
            title: "运动和力的关系",
            desc: "牛顿第一定律、牛顿第二定律、力学单位制及动力学两类基本问题",
            sections: [
              {
                id: "bx1_c4_s1",
                code: "第1节",
                title: "牛顿第一定律",
                pageRange: "P.100 - P.105",
                hours: "1课时",
                difficulty: "基础",
                target: "回顾伽利略理想斜面实验，深刻理解惯性是物体的固有属性，质量是惯性大小的唯一量度。",
                keyConcepts: ["理想实验", "惯性定律", "惯性与质量", "维持运动无需力"],
                formulas: ["v = const (当 ∑F = 0)"]
              },
              {
                id: "bx1_c4_s2",
                code: "第2节",
                title: "实验：探究加速度与力、质量的关系",
                pageRange: "P.106 - P.112",
                hours: "2课时",
                difficulty: "实验",
                target: "掌握控制变量法在物理实验中的应用；掌握平衡摩擦力的方法与化曲为直的数据处理技巧。",
                keyConcepts: ["控制变量法", "平衡摩擦力", "a-F图像", "a-(1/m)图像"],
                formulas: ["a ∝ F (m一定)", "a ∝ 1/m (F一定)"]
              },
              {
                id: "bx1_c4_s3",
                code: "第3节",
                title: "牛顿第二定律",
                pageRange: "P.113 - P.118",
                hours: "2课时",
                difficulty: "核心考点",
                target: "理解牛顿第二定律的瞬时性、矢量性、同体性与独立性；掌握1牛顿力的科学定义。",
                keyConcepts: ["瞬时性", "矢量性", "力与加速度同向", "因果关系"],
                formulas: ["F_合 = ma", "∑F_x = ma_x, ∑F_y = ma_y"]
              },
              {
                id: "bx1_c4_s4",
                code: "第4节",
                title: "力学单位制",
                pageRange: "P.119 - P.123",
                hours: "1课时",
                difficulty: "基础",
                target: "了解基本量与基本单位（m, kg, s），掌握导出单位的推导方法，能够利用量纲分析检验公式正确性。",
                keyConcepts: ["基本量", "基本单位", "导出单位", "量纲检验"],
                formulas: ["1 N = 1 kg·m/s²"]
              },
              {
                id: "bx1_c4_s5",
                code: "第5节",
                title: "牛顿运动定律的应用",
                pageRange: "P.124 - P.131",
                hours: "2课时",
                difficulty: "难点",
                target: "掌握已知受力求运动和已知运动求受力的动力学两类基本解题程序，突破斜面滑块模型与传送带模型。",
                keyConcepts: ["受力分析桥梁", "加速度纽带", "板块模型", "传送带模型"],
                formulas: ["F_合 → a → 运动学公式(x, v, t)"]
              },
              {
                id: "bx1_c4_s6",
                code: "第6节",
                title: "超重和失重",
                pageRange: "P.132 - P.138",
                hours: "1课时",
                difficulty: "应用",
                target: "通过体重计与压力传感器实验，理解超重与失重的加速度判断准则，认识完全失重状态下的特殊现象。",
                keyConcepts: ["视重与实重", "向上加速/向下减速(超重)", "完全失重", "太空授课"],
                formulas: ["F_N = m(g + a) (超重)", "F_N = m(g - a) (失重)"]
              }
            ]
          }
        ]
      },
      {
        id: "bx2",
        name: "必修第二册",
        shortName: "必修二",
        grade: "高一下学期",
        color: "#06b6d4",
        chapters: [
          {
            id: "bx2_c5",
            code: "第五章",
            title: "抛体运动",
            desc: "曲线运动条件、运动合成与分解及平抛运动规律与实验探究",
            sections: [
              { id: "bx2_c5_s1", code: "第1节", title: "曲线运动", pageRange: "P.2 - P.7", hours: "1课时", difficulty: "基础", target: "理解曲线运动速度方向及受力与轨迹弯曲方向的关系。", keyConcepts: ["切线方向", "合外力指向凹侧", "变速运动"], formulas: ["v切线方向"] },
              { id: "bx2_c5_s2", code: "第2节", title: "运动的合成与分解", pageRange: "P.8 - P.14", hours: "2课时", difficulty: "重点", target: "掌握分运动的独立性与等时性，突破小船渡河与绳杆牵连速度模型。", keyConcepts: ["独立性", "等时性", "渡河最短时间", "渡河最短位移", "关联速度"], formulas: ["v_合 = √(v_x² + v_y²)", "t = d / v_垂直"] },
              { id: "bx2_c5_s3", code: "第3节", title: "实验：探究平抛运动的特点", pageRange: "P.15 - P.20", hours: "2课时", difficulty: "实验", target: "设计实验描绘平抛运动轨迹，证实水平分运动为匀速、竖直分运动为自由落体。", keyConcepts: ["频闪摄影", "平抛仪", "水平匀速", "竖直落体"], formulas: ["x = v₀t", "y = ½gt²"] },
              { id: "bx2_c5_s4", code: "第4节", title: "抛体运动的规律", pageRange: "P.21 - P.28", hours: "2课时", difficulty: "高考热点", target: "熟练推导平抛运动速度偏角与位移偏角关系，掌握斜面平抛落点与击中问题。", keyConcepts: ["速度分解", "位移分解", "tanθ = 2tanα", "斜面抛体"], formulas: ["v_y = gt, v = √(v₀² + g²t²)", "tanθ = gt/v₀", "tanα = y/x = gt/2v₀"] }
            ]
          },
          {
            id: "bx2_c6",
            code: "第六章",
            title: "圆周运动",
            desc: "线速度、角速度、向心加速度、向心力以及生活中的圆周运动模型",
            sections: [
              { id: "bx2_c6_s1", code: "第1节", title: "圆周运动", pageRange: "P.30 - P.35", hours: "1课时", difficulty: "基础", target: "掌握线速度、角速度、周期和转速的定义及相互换算关系。", keyConcepts: ["线速度v", "角速度ω", "周期T", "转速n", "皮带与齿轮传动"], formulas: ["v = ωr", "ω = 2π/T = 2πn", "v = 2πr/T"] },
              { id: "bx2_c6_s2", code: "第2节", title: "向心力", pageRange: "P.36 - P.42", hours: "2课时", difficulty: "重点", target: "探究向心力大小与质量、角速度、半径的关系，明确向心力是按效果命名的力。", keyConcepts: ["向心力来源", "效果力", "向心力演示仪", "圆锥摆"], formulas: ["F_n = m v²/r = m ω²r = m (4π²/T²)r"] },
              { id: "bx2_c6_s3", code: "第3节", title: "向心加速度", pageRange: "P.43 - P.48", hours: "1课时", difficulty: "难点", target: "运用矢量三角形极限推导向心加速度公式，理解向心加速度只改变速度方向。", keyConcepts: ["向心加速度", "速度方向改变率", "推导极限法"], formulas: ["a_n = v²/r = ω²r = ωv"] },
              { id: "bx2_c6_s4", code: "第4节", title: "生活中的圆周运动", pageRange: "P.49 - P.58", hours: "2课时", difficulty: "高考热点", target: "解决火车转弯外轨超高、汽车过拱桥、竖直面绳杆模型及离心运动问题。", keyConcepts: ["火车弯道垫高", "拱形桥失重", "竖直平面圆周运动", "绳模型最高点临界", "杆模型轻支撑"], formulas: ["v_临界 = √(gr) (绳)", "tanθ = v²/(gR) (转弯)", "F_N = m(g - v²/R) (拱桥)"] }
            ]
          },
          {
            id: "bx2_c7",
            code: "第七章",
            title: "万有引力与宇宙航行",
            desc: "开普勒行星运动定律、万有引力定律与人造卫星宇宙航行",
            sections: [
              { id: "bx2_c7_s1", code: "第1节", title: "行星的运动", pageRange: "P.60 - P.65", hours: "1课时", difficulty: "基础", target: "理解开普勒三定律，认识行星绕太阳运动的椭圆轨道与面积速度恒定。", keyConcepts: ["开普勒第一定律", "第二定律(面积速度)", "第三定律(a³/T²=k)"], formulas: ["a³/T² = k"] },
              { id: "bx2_c7_s2", code: "第2节", title: "万有引力定律", pageRange: "P.66 - P.72", hours: "2课时", difficulty: "重点", target: "掌握牛顿月-地检验推导逻辑，理解卡文迪什扭秤实验测定G的放大思想。", keyConcepts: ["月地检验", "平方反比定律", "卡文迪什扭秤", "引力常量G"], formulas: ["F = G(m₁m₂)/r²", "G = 6.67×10⁻¹¹ N·m²/kg²"] },
              { id: "bx2_c7_s3", code: "第3节", title: "万有引力理论的成就", pageRange: "P.73 - P.79", hours: "2课时", difficulty: "重点", target: "掌握天体质量和密度的测定方法（黄金代换式与环绕法），理解海王星发现。", keyConcepts: ["称量地球", "天体质量测定", "天体密度", "黄金代换式"], formulas: ["GM = gR²", "M = 4π²r³ / (GT²)", "ρ = 3π / (GT²) (表面环绕)"] },
              { id: "bx2_c7_s4", code: "第4节", title: "宇宙航行", pageRange: "P.80 - P.88", hours: "2课时", difficulty: "高考热点", target: "掌握三大宇宙速度推导，熟练应用高轨低速大周期口诀，理解空间站变轨对接。", keyConcepts: ["第一宇宙速度7.9km/s", "第二宇宙速度11.2km/s", "第三宇宙速度16.7km/s", "同步卫星", "变轨对接"], formulas: ["v = √(GM/r)", "ω = √(GM/r³)", "T = 2π√(r³/GM)"] },
              { id: "bx2_c7_s5", code: "第5节", title: "相对论时空观与黑洞", pageRange: "P.89 - P.96", hours: "1课时", difficulty: "拓展", target: "初步了解爱因斯坦狭义与广义相对论时空观、光速不变原理及黑洞引力红移。", keyConcepts: ["光速不变原理", "钟慢尺缩", "引力弯曲", "史瓦西半径"], formulas: ["Δt = Δτ / √(1 - v²/c²)", "R_s = 2GM/c²"] }
            ]
          },
          {
            id: "bx2_c8",
            code: "第八章",
            title: "机械能守恒定律",
            desc: "功与功率、动能定理、重力势能及机械能守恒定律应用与验证",
            sections: [
              { id: "bx2_c8_s1", code: "第1节", title: "功与功率", pageRange: "P.98 - P.105", hours: "2课时", difficulty: "重点", target: "理解正功与负功的物理意义，掌握恒力做功与机车恒功率启动两种启动过程。", keyConcepts: ["功的定义", "正负功", "平均功率与瞬时功率", "机车启动P=Fv"], formulas: ["W = Fscosα", "P = W/t = Fvcosα", "F - f = ma"] },
              { id: "bx2_c8_s2", code: "第2节", title: "重力势能", pageRange: "P.106 - P.111", hours: "1课时", difficulty: "重点", target: "掌握重力做功与路径无关特征，理解重力势能的系统性与相对性（零势能参考面）。", keyConcepts: ["重力做功特征", "重力势能Ep", "重力做功与势能变化关系", "零势能面"], formulas: ["W_G = -ΔE_p = mgh₁ - mgh₂", "E_p = mgh"] },
              { id: "bx2_c8_s3", code: "第3节", title: "动能和动能定理", pageRange: "P.112 - P.119", hours: "2课时", difficulty: "核心考点", target: "推导动能定理，掌握合力做功与总动能变化的关系，熟练运用动能定理解决多过程变力做功问题。", keyConcepts: ["动能定义", "动能定理", "变力做功求解", "多过程分步与全程法"], formulas: ["E_k = ½mv²", "W_合 = ΔE_k = ½mv₂² - ½mv₁²"] },
              { id: "bx2_c8_s4", code: "第4节", title: "机械能守恒定律", pageRange: "P.120 - P.127", hours: "2课时", difficulty: "难点", target: "掌握机械能守恒的条件（只有重力或弹力做功），运用守恒定律解决过山车、弹簧振子等复杂系统问题。", keyConcepts: ["机械能定义", "守恒条件", "能量转化与守恒", "系统势能"], formulas: ["E_k1 + E_p1 = E_k2 + E_p2", "ΔE_k = -ΔE_p"] },
              { id: "bx2_c8_s5", code: "第5节", title: "实验：验证机械能守恒定律", pageRange: "P.128 - P.136", hours: "2课时", difficulty: "实验", target: "利用自由落体纸带或光电门传感器验证 gh ≈ ½v²，掌握打点计时器第1、2点间距判据。", keyConcepts: ["纸带验证", "光电门气垫导轨", "误差分析(阻力)", "速度瞬时计算"], formulas: ["gh = ½v_n²", "v_n = (h_{n+1} - h_{n-1}) / 2T"] }
            ]
          }
        ]
      },
      {
        id: "bx3",
        name: "必修第三册",
        shortName: "必修三",
        grade: "高二上学期",
        color: "#10b981",
        chapters: [
          {
            id: "bx3_c9",
            code: "第九章",
            title: "静电场及其应用",
            desc: "电荷守恒定律、库仑定律、电场强度与静电屏蔽",
            sections: [
              { id: "bx3_c9_s1", code: "第1节", title: "电荷", pageRange: "P.2 - P.8", hours: "1课时", difficulty: "基础", target: "理解三种起电方式与电荷守恒定律，掌握元电荷e。", keyConcepts: ["摩擦起电", "感应起电", "接触起电", "元电荷e=1.6×10⁻¹⁹C"], formulas: ["Q = ne", "∑Q = const"] },
              { id: "bx3_c9_s2", code: "第2节", title: "库仑定律", pageRange: "P.9 - P.15", hours: "2课时", difficulty: "重点", target: "掌握点电荷相互作用规律及库仑定律适用条件，熟练求解库仑力平衡问题。", keyConcepts: ["点电荷模型", "库仑定律", "静电力常量k", "三点共线平衡规律"], formulas: ["F = k(q₁q₂)/r²", "k = 8.99×10⁹ N·m²/C²"] },
              { id: "bx3_c9_s3", code: "第3节", title: "电场 电场强度", pageRange: "P.16 - P.23", hours: "2课时", difficulty: "难点", target: "理解电场的物质性，掌握电场强度的定义式与点电荷场强决定式，绘制典型电场线。", keyConcepts: ["电场物质性", "检验电荷与场源电荷", "场强E定义式", "点电荷场强", "电场线"], formulas: ["E = F/q", "E = kQ/r²", "E_合 = ∑E_i"] },
              { id: "bx3_c9_s4", code: "第4节", title: "静电的防止与利用", pageRange: "P.24 - P.31", hours: "1课时", difficulty: "应用", target: "理解静电感应平衡状态下导体内部场强为零，掌握静电屏蔽与尖端放电原理。", keyConcepts: ["静电平衡", "内部场强为零", "净电荷分布外表面", "静电屏蔽", "尖端放电"], formulas: ["E_内 = 0", "φ_导体 = const"] }
            ]
          },
          {
            id: "bx3_c10",
            code: "第十章",
            title: "静电场中的能量",
            desc: "电势能、电势、电势差及带电粒子在电场中的加速与偏转",
            sections: [
              { id: "bx3_c10_s1", code: "第1节", title: "电势能和电势", pageRange: "P.34 - P.41", hours: "2课时", difficulty: "难点", target: "掌握静电力做功与电势能变化关系，理解电势是电场能的性质。", keyConcepts: ["静电力做功与路径无关", "电势能Ep", "电势φ定义", "等势面"], formulas: ["W_AB = E_{pA} - E_{pB} = -ΔE_p", "φ = E_p / q"] },
              { id: "bx3_c10_s2", code: "第2节", title: "电势差", pageRange: "P.42 - P.48", hours: "1课时", difficulty: "重点", target: "掌握电势差定义式与电势差与电势关系，计算静电力做功。", keyConcepts: ["电势差U_AB", "电势差与参考点无关", "做功公式"], formulas: ["U_{AB} = φ_A - φ_B", "W_{AB} = q U_{AB}"] },
              { id: "bx3_c10_s3", code: "第3节", title: "电势差与电场强度的关系", pageRange: "P.49 - P.55", hours: "2课时", difficulty: "重点", target: "推导匀强电场中 U = Ed 关系式，理解电场强度沿等势面法线方向指向电势降低最快的方向。", keyConcepts: ["匀强电场关系式", "沿场强方向电势降低最快", "等差等势面"], formulas: ["E = U / d", "U = Ed"] },
              { id: "bx3_c10_s4", code: "第4节", title: "电容器的电容", pageRange: "P.56 - P.63", hours: "2课时", difficulty: "高考热点", target: "掌握电容定义式与平行板电容器决定式，分析电容器充电恒压与断开恒电荷动态变化规律。", keyConcepts: ["电容C定义", "平行板电容决定式", "介电常数ε", "恒压U不变模型", "恒荷Q不变模型"], formulas: ["C = Q / U", "C = εS / (4πkd)"] },
              { id: "bx3_c10_s5", code: "第5节", title: "带电粒子在电场中的运动", pageRange: "P.64 - P.74", hours: "2课时", difficulty: "核心考点", target: "熟练掌握带电粒子在匀强电场中的加速与类平抛偏转规律，掌握示波管工作原理。", keyConcepts: ["电场加速动能定理", "电场偏转类平抛", "侧移量y", "偏转角tanθ", "反向延长线交点"], formulas: ["qU = ½mv²", "y = ½at² = qUL² / (2mdv₀²)", "tanθ = qUL / (mdv₀²)"] }
            ]
          },
          {
            id: "bx3_c11",
            code: "第十一章",
            title: "电路及其应用",
            desc: "电源、电动势、电阻定律、欧姆定律与电表改装及伏安法测电阻",
            sections: [
              { id: "bx3_c11_s1", code: "第1节", title: "电源和电流", pageRange: "P.76 - P.81", hours: "1课时", difficulty: "基础", target: "理解恒定电场形成机制与电流微观表达式，掌握电源电动势概念。", keyConcepts: ["恒定电流", "电流微观表达式I=nqSv", "电动势E物理意义", "内阻r"], formulas: ["I = q/t = nqSv", "E = W_非/q"] },
              { id: "bx3_c11_s2", code: "第2节", title: "导体的电阻", pageRange: "P.82 - P.88", hours: "2课时", difficulty: "重点", target: "探究导体电阻决定因素，掌握电阻定律及电阻率随温度变化规律。", keyConcepts: ["欧姆定律", "伏安特性曲线", "电阻定律", "电阻率ρ与温度"], formulas: ["I = U/R", "R = ρL/S"] },
              { id: "bx3_c11_s3", code: "第3节", title: "实验：导体电阻率的测量", pageRange: "P.89 - P.96", hours: "2课时", difficulty: "实验", target: "掌握螺旋测微器与游标卡尺读数，掌握电流表内接法与外接法误差分析。", keyConcepts: ["螺旋测微器(0.01mm)", "游标卡尺(0.1/0.05/0.02mm)", "电流表内外接误差", "分压式与限流式接法"], formulas: ["R_x = U/I", "内接大电阻误差小", "外接小电阻误差小"] }
            ]
          }
        ]
      },
      {
        id: "xb1",
        name: "选择性必修第一册",
        shortName: "选必一",
        grade: "高二下学期",
        color: "#8b5cf6",
        chapters: [
          {
            id: "xb1_c1",
            code: "第一章",
            title: "动量守恒定律",
            desc: "动量定理、动量守恒定律、弹性碰撞与非弹性碰撞及反冲运动",
            sections: [
              { id: "xb1_c1_s1", code: "第1节", title: "动量", pageRange: "P.2 - P.7", hours: "1课时", difficulty: "重点", target: "理解动量是矢量，掌握动量变化量Δp的矢量运算法则。", keyConcepts: ["动量p=mv", "动量变化量Δp", "矢量三角形"], formulas: ["p = mv", "Δp = p₂ - p₁ = m v₂ - m v₁"] },
              { id: "xb1_c1_s2", code: "第2节", title: "动量定理", pageRange: "P.8 - P.14", hours: "2课时", difficulty: "重点", target: "推导动量定理，掌握冲量定义式，运用动量定理解决缓冲保护与连续流体冲击力问题。", keyConcepts: ["冲量I=Ft", "动量定理", "缓冲减冲", "微元流体模型(柱体水流/光压)"], formulas: ["I = F·Δt", "I_合 = Δp = mv₂ - mv₁", "F = (Δm/Δt)v"] },
              { id: "xb1_c1_s3", code: "第3节", title: "动量守恒定律", pageRange: "P.15 - P.22", hours: "2课时", difficulty: "核心考点", target: "掌握动量守恒定律的成立条件（合外力为零/内力远大于外力/某一方向守恒），熟练建立守恒方程。", keyConcepts: ["系统内力与外力", "守恒条件", "单方向动量守恒", "人船模型"], formulas: ["m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'", "m₁x₁ = m₂x₂ (人船)"] },
              { id: "xb1_c1_s4", code: "第4节", title: "实验：验证动量守恒定律", pageRange: "P.23 - P.28", hours: "2课时", difficulty: "实验", target: "利用斜槽轨道碰撞或气垫导轨光电门验证碰撞前后动量守恒。", keyConcepts: ["斜槽平抛落点法", "防倒冲", "气垫导轨", "误差判定"], formulas: ["m₁·OP = m₁·OM + m₂·ON'"] },
              { id: "xb1_c1_s5", code: "第5节", title: "弹性碰撞和非弹性碰撞", pageRange: "P.29 - P.36", hours: "2课时", difficulty: "难点", target: "深入剖析完全弹性碰撞、非弹性碰撞与完全非弹性碰撞的能量转化规律，掌握速度结论式。", keyConcepts: ["完全弹性碰撞(无损)", "完全非弹性碰撞(机械能损失最大)", "碰撞可能与不可能判据"], formulas: ["v₁' = (m₁-m₂)v₁ / (m₁+m₂)", "v₂' = 2m₁v₁ / (m₁+m₂)", "v_共 = (m₁v₁+m₂v₂)/(m₁+m₂)"] },
              { id: "xb1_c1_s6", code: "第6节", title: "反冲现象 火箭", pageRange: "P.37 - P.44", hours: "1课时", difficulty: "应用", target: "理解火箭推进与反冲运动规律，了解我国航天事业成就（长征系列运载火箭）。", keyConcepts: ["反冲运动", "火箭推进原理", "齐奥尔科夫斯基公式", "航天大国"], formulas: ["M v_车 = - m v_气", "v = u ln(M₀/M)"] }
            ]
          },
          {
            id: "xb1_c2",
            code: "第二章",
            title: "机械振动",
            desc: "简谐运动、单摆周期公式、阻尼振动与受迫振动及共振",
            sections: [
              { id: "xb1_c2_s1", code: "第1节", title: "简谐运动", pageRange: "P.46 - P.52", hours: "1课时", difficulty: "重点", target: "理解简谐运动的回复力特征与x-t正弦图像。", keyConcepts: ["回复力F=-kx", "位移与回复力反向", "x-t正弦曲线"], formulas: ["F = -kx", "x = A sin(ωt + φ)"] },
              { id: "xb1_c2_s2", code: "第2节", title: "简谐运动的描述", pageRange: "P.53 - P.58", hours: "1课时", difficulty: "基础", target: "掌握振幅、周期、频率与相位的物理含义。", keyConcepts: ["振幅A", "周期T与频率f", "初相与相位差"], formulas: ["T = 1/f = 2π/ω"] },
              { id: "xb1_c2_s3", code: "第3节", title: "单摆", pageRange: "P.59 - P.65", hours: "2课时", difficulty: "重点", target: "推导小角度单摆简谐运动条件，掌握惠更斯单摆周期公式。", keyConcepts: ["小角度摆动(θ<5°)", "切向重力分力作回复力", "单摆周期公式"], formulas: ["T = 2π√(L/g)"] },
              { id: "xb1_c2_s4", code: "第4节", title: "实验：用单摆测量重力加速度", pageRange: "P.66 - P.71", hours: "2课时", difficulty: "实验", target: "掌握秒表计时累积法（测30~50次全振动），运用T²-L图像斜率精准测定g。", keyConcepts: ["有效摆长L=l+d/2", "累积计时", "T²-L图像法", "系统误差消除"], formulas: ["g = 4π²L / T² = 4π² / k (k为斜率)"] },
              { id: "xb1_c2_s5", code: "第5节", title: "受迫振动 共振", pageRange: "P.72 - P.78", hours: "1课时", difficulty: "应用", target: "区分自由振动、阻尼振动与受迫振动，理解共振发生的条件（驱动力频率等于固有频率）。", keyConcepts: ["固有频率f₀", "驱动力频率f_驱", "共振曲线", "减震与共振利用"], formulas: ["f_受迫 = f_驱", "f_驱 = f₀ 时振幅极大"] }
            ]
          },
          {
            id: "xb1_c3",
            code: "第三章",
            title: "机械波",
            desc: "波的形成、波速公式、波的干涉衍射与多普勒效应",
            sections: [
              { id: "xb1_c3_s1", code: "第1节", title: "波的形成和传播", pageRange: "P.80 - P.86", hours: "1课时", difficulty: "基础", target: "理解机械波传播的是振动形式和能量，介质质点只在平衡位置附近振动不随波迁移。", keyConcepts: ["质点振动", "横波与纵波", "质点不随波迁移", "前带后后跟前"], formulas: ["波传播距离 s = vt"] },
              { id: "xb1_c3_s2", code: "第2节", title: "简谐波的图像", pageRange: "P.87 - P.93", hours: "2课时", difficulty: "难点", target: "区分振动图像(y-t)与波动图像(y-x)，掌握同侧法、微移法判定质点振动方向与波传播方向。", keyConcepts: ["波动图像", "波长λ", "同侧法判断方向", "微移法"], formulas: ["y = A sin(2π(t/T - x/λ))"] },
              { id: "xb1_c3_s3", code: "第3节", title: "波长、频率和波速", pageRange: "P.94 - P.99", hours: "2课时", difficulty: "重点", target: "掌握波速决定因素（介质决定波速，波源决定频率），熟练求解机械波多解性问题。", keyConcepts: ["波速公式v=λf", "介质决定v", "波源决定f", "空间周期与时间周期多解"], formulas: ["v = λ/T = λf", "Δt = nT + t₀, Δx = nλ + x₀"] },
              { id: "xb1_c3_s4", code: "第4节", title: "波的干涉和衍射", pageRange: "P.100 - P.107", hours: "2课时", difficulty: "高考热点", target: "理解明显衍射条件（障碍物尺寸与波长相当），掌握相干波干涉加强点与减弱点路程差判据。", keyConcepts: ["明显衍射条件", "相干波条件", "波峰与波谷相遇", "加强区与减弱区"], formulas: ["Δr = nλ (加强)", "Δr = (2n+1)λ/2 (减弱)"] },
              { id: "xb1_c3_s5", code: "第5节", title: "多普勒效应", pageRange: "P.108 - P.114", hours: "1课时", difficulty: "应用", target: "掌握波源与观察者相对运动引起接收频率变化的规律，了解红移与宇宙膨胀。", keyConcepts: ["多普勒效应", "相对靠近接收f增大", "相对远离接收f减小", "红移与蓝移"], formulas: ["f' = f (v ± v_人) / (v ∓ v_源)"] }
            ]
          }
        ]
      },
      {
        id: "xb2",
        name: "选择性必修第二册",
        shortName: "选必二",
        grade: "高三上学期",
        color: "#f59e0b",
        chapters: [
          {
            id: "xb2_c1",
            code: "第一章",
            title: "安培力与洛伦兹力",
            desc: "磁场、磁感应强度、左手定则、安培力与带电粒子在匀强磁场中的圆周运动",
            sections: [
              { id: "xb2_c1_s1", code: "第1节", title: "磁场对通电导线的作用力——安培力", pageRange: "P.2 - P.9", hours: "2课时", difficulty: "重点", target: "掌握左手定则判断安培力方向，熟练计算弯曲导线等效长度与通电导线力学平衡。", keyConcepts: ["左手定则", "安培力公式", "有效长度L", "磁电式电流表原理"], formulas: ["F = ILBsinθ", "F = IL_{等效}B"] },
              { id: "xb2_c1_s2", code: "第2节", title: "磁场对运动电荷的作用力——洛伦兹力", pageRange: "P.10 - P.16", hours: "2课时", difficulty: "重点", target: "理解洛伦兹力方向判定（注意正负电荷差异），深刻理解洛伦兹力永远不做功的特性。", keyConcepts: ["微观洛伦兹力", "安培力微观本质", "洛伦兹力不做功", "速度选择器"], formulas: ["f = qvBsinθ", "f ⊥ v, W_洛 = 0", "qE = qvB ⇒ v = E/B"] },
              { id: "xb2_c1_s3", code: "第3节", title: "带电粒子在匀强磁场中的运动", pageRange: "P.17 - P.25", hours: "2课时", difficulty: "核心考点", target: "掌握圆心确定方法（两速度垂线交点/弦中垂线交点），推导轨道半径与周期公式，突破磁聚焦与发散。", keyConcepts: ["洛伦兹力提供向心力", "轨道半径R", "周期T与速度无关", "找圆心画轨迹定偏转角"], formulas: ["qvB = mv²/R ⇒ R = mv / (qB)", "T = 2πm / (qB)", "t = (θ/2π)T"] },
              { id: "xb2_c1_s4", code: "第4节", title: "质谱仪与回旋加速器", pageRange: "P.26 - P.34", hours: "2课时", difficulty: "高考热点", target: "剖析质谱仪同位素分离机制，掌握回旋加速器高频交变电场周期与粒子回旋周期同步原理及最大动能决定因素。", keyConcepts: ["质谱仪比荷", "回旋加速器D形盒", "交变电场同步", "最大动能只与R_D和B有关"], formulas: ["q/m = 2U / (B²R²)", "T_电 = T_磁 = 2πm/(qB)", "E_{km} = q²B²R_D² / (2m)"] }
            ]
          },
          {
            id: "xb2_c2",
            code: "第二章",
            title: "电磁感应",
            desc: "楞次定律、法拉第电磁感应定律、动生电动势、感生电动势与互感自感",
            sections: [
              { id: "xb2_c2_s1", code: "第1节", title: "楞次定律", pageRange: "P.36 - P.43", hours: "2课时", difficulty: "核心考点", target: "深刻理解增反减同、来拒去留、增缩减扩的阻碍本质，熟练应用右手定则与楞次定律判断感应电流方向。", keyConcepts: ["磁通量Φ=BS", "楞次定律", "阻碍磁通量变化", "右手定则", "来拒去留"], formulas: ["Φ = B·S·cosθ", "增反减同判感应场方向"] },
              { id: "xb2_c2_s2", code: "第2节", title: "法拉第电磁感应定律", pageRange: "P.44 - P.51", hours: "2课时", difficulty: "核心考点", target: "掌握法拉第电磁感应定律推导，区分平均感应电动势与瞬时电动势，推导电荷量q = nΔΦ/R公式。", keyConcepts: ["磁通量变化率ΔΦ/Δt", "法拉第定律", "感生电动势", "流过截面电荷量q"], formulas: ["E = n ΔΦ/Δt", "E = n S ΔB/Δt", "q = n ΔΦ / R_总"] },
              { id: "xb2_c2_s3", code: "第3节", title: "涡流、电磁阻尼和电磁驱动", pageRange: "P.52 - P.59", hours: "1课时", difficulty: "应用", target: "理解电磁炉涡流热效应与微安表运输电磁阻尼保护，认识感应电动机的电磁驱动。", keyConcepts: ["涡流效应", "硅钢片叠压", "电磁阻尼", "电磁驱动", "磁悬浮列车"], formulas: ["E_{涡} ∝ ΔB/Δt", "阻尼安培力F ∝ v"] },
              { id: "xb2_c2_s4", code: "第4节", title: "互感和自感", pageRange: "P.60 - P.67", hours: "2课时", difficulty: "难点", target: "观察通电自感与断电自感灯泡明暗现象，掌握自感系数L与磁场能量储存。", keyConcepts: ["互感现象", "通电自感延缓", "断电自感强脉冲", "自感系数L", "磁场能量"], formulas: ["E_L = - L ΔI/Δt"] }
            ]
          },
          {
            id: "xb2_c3",
            code: "第三章",
            title: "交变电流",
            desc: "正弦交变电流的产生、有效值、变压器与远距离输电",
            sections: [
              { id: "xb2_c3_s1", code: "第1节", title: "交变电流", pageRange: "P.70 - P.76", hours: "2课时", difficulty: "重点", target: "掌握矩形线圈在匀强磁场中匀速转动产生正弦交流电的物理过程与中性面特征。", keyConcepts: ["中性面(Φ最大,E=0)", "正弦交流电", "瞬时值表达式", "峰值E_m=nBSω"], formulas: ["e = E_m sin(ωt)", "E_m = n B S ω"] },
              { id: "xb2_c3_s2", code: "第2节", title: "交变电流的描述", pageRange: "P.77 - P.83", hours: "2课时", difficulty: "核心考点", target: "深刻理解热效应等效法推导交流电有效值，掌握四值（瞬时值、峰值、有效值、平均值）的针对性应用情景。", keyConcepts: ["热效应等效", "有效值(测电表/额定功率/发热)", "平均值(算电荷量q)", "瞬时值(绝缘击穿)"], formulas: ["I = I_m / √2", "U = U_m / √2", "E = E_m / √2 (正弦波)"] },
              { id: "xb2_c3_s3", code: "第3节", title: "变压器", pageRange: "P.84 - P.92", hours: "2课时", difficulty: "高考热点", target: "掌握理想变压器电压比、电流比与功率守恒关系，掌握原副线圈动态负载分析与等效电阻法。", keyConcepts: ["理想变压器", "电压比U₁/U₂=n₁/n₂", "功率输入等于输出P₁=P₂", "电流比I₁/I₂=n₂/n₁", "等效电阻R'=k²R"], formulas: ["U₁/U₂ = n₁/n₂", "I₁/I₂ = n₂/n₁", "P_{入} = P_{出}"] },
              { id: "xb2_c3_s4", code: "第4节", title: "电能的输送", pageRange: "P.93 - P.100", hours: "2课时", difficulty: "重点", target: "分析远距离输电线上功率损耗与电压损失，掌握高压输电的核心优势与四变压器计算回路。", keyConcepts: ["输电线损耗ΔP=I²r", "电压损失ΔU=Ir", "升压变压器", "降压变压器", "输电效率"], formulas: ["ΔP = (P/U)² r_{线}", "U₁ → 升压 → U₂ → 输电线ΔU → U₃ → 降压 → U₄"] }
            ]
          }
        ]
      },
      {
        id: "xb3",
        name: "选择性必修第三册",
        shortName: "选必三",
        grade: "高三下学期",
        color: "#ec4899",
        chapters: [
          {
            id: "xb3_c1",
            code: "第一章",
            title: "分子动理论",
            desc: "阿伏加德罗常数、布朗运动、分子间作用力与内能",
            sections: [
              { id: "xb3_c1_s1", code: "第1节", title: "分子的大小", pageRange: "P.2 - P.7", hours: "1课时", difficulty: "基础", target: "掌握油膜法估测分子大小实验与宏观微观阿伏加德罗常数物理纽带。", keyConcepts: ["油膜法", "单分子油膜", "阿伏加德罗常数N_A", "微观球体与立方体模型"], formulas: ["d = V / S", "N_A = M / m_0 = V_m / v_0"] },
              { id: "xb3_c1_s2", code: "第2节", title: "分子的热运动", pageRange: "P.8 - P.13", hours: "1课时", difficulty: "基础", target: "理解布朗运动是液体分子无规则热运动的间接反映，温度是分子平均动能的标志。", keyConcepts: ["扩散现象", "布朗运动", "温度越高微粒越小运动越剧烈", "统计规律"], formulas: ["Ē_k = 3/2 k_B T"] },
              { id: "xb3_c1_s3", code: "第3节", title: "分子间的作用力", pageRange: "P.14 - P.20", hours: "2课时", difficulty: "重点", target: "分析引力斥力随距离变化曲线，掌握平衡距离r₀处分子势能最小。", keyConcepts: ["引力与斥力", "合力F-r曲线", "平衡距离r₀", "分子势能Ep-r曲线"], formulas: ["F = F_引 - F_斥", "r = r₀ 时 F_合 = 0, E_p 最小"] }
            ]
          },
          {
            id: "xb3_c2",
            code: "第二章",
            title: "气体、固体和液体",
            desc: "理想气体状态方程、气体实验三大定律、表面张力与液晶",
            sections: [
              { id: "xb3_c2_s1", code: "第1节", title: "温度和温标", pageRange: "P.22 - P.27", hours: "1课时", difficulty: "基础", target: "理解热平衡定律与热力学温标T与摄氏温标t的换算关系。", keyConcepts: ["热平衡", "热力学温标", "绝对零度-273.15℃"], formulas: ["T = t + 273.15 K"] },
              { id: "xb3_c2_s2", code: "第2节", title: "气体的等温变化", pageRange: "P.28 - P.35", hours: "2课时", difficulty: "重点", target: "探究玻意耳定律，绘制p-V双曲线与p-(1/V)过原点直线。", keyConcepts: ["玻意耳定律", "等温线p-V", "封闭气体压强计算(水银柱/活塞)"], formulas: ["p₁V₁ = p₂V₂ = const (T一定)"] },
              { id: "xb3_c2_s3", code: "第3节", title: "气体的等容变化和等压变化", pageRange: "P.36 - P.42", hours: "2课时", difficulty: "重点", target: "掌握查理定律与盖-吕萨克定律，理解p-T与V-T图像。", keyConcepts: ["查理定律", "盖吕萨克定律", "等容线", "等压线"], formulas: ["p₁/T₁ = p₂/T₂", "V₁/T₁ = V₂/T₂"] },
              { id: "xb3_c2_s4", code: "第4节", title: "理想气体状态方程", pageRange: "P.43 - P.50", hours: "2课时", difficulty: "核心考点", target: "熟练运用 pV/T = C 解决变质量气体（充气、抽气、分装）与活塞连通器问题。", keyConcepts: ["理想气体模型", "综合状态方程", "克拉伯龙方程", "变质量问题等效处理"], formulas: ["p₁V₁/T₁ = p₂V₂/T₂ = C", "pV = nRT"] }
            ]
          },
          {
            id: "xb3_c3",
            code: "第三章",
            title: "热力学定律",
            desc: "热力学第一定律、能量守恒定律与热力学第二定律微观意义",
            sections: [
              { id: "xb3_c3_s1", code: "第1节", title: "热力学第一定律", pageRange: "P.52 - P.58", hours: "2课时", difficulty: "重点", target: "掌握符号法则（吸热Q>0、外界对系统做功W>0、内能增加ΔU>0），综合分析气缸气体吸放热与做功。", keyConcepts: ["做功与传热", "热力学第一定律", "正负号准则", "绝热膨胀/压缩"], formulas: ["ΔU = W + Q"] },
              { id: "xb3_c3_s2", code: "第2节", title: "热力学第二定律", pageRange: "P.59 - P.66", hours: "1课时", difficulty: "重点", target: "理解克劳修斯表述与开尔文表述，明确热传导和做功的方向性与熵增原理。", keyConcepts: ["热传导不可逆", "开尔文表述(第二类永动机不可能)", "克劳修斯表述", "熵增与无序度"], formulas: ["η = W/Q₁ < 1 (热机效率)"] }
            ]
          }
        ]
      }
    ];

