/* 工作台 2~7 模块数据（副标签页 + 示例文件）—— 取自物理界面1.html 设计稿 */
window.WORKBENCH_DATA = {
      plans: {
        id: "plans",
        name: "2. 教学计划安排",
        icon: "📅",
        desc: "2025-2026学年高三物理一轮复习进度、人教版教材大单元排课与实验周历",
        subtabs: [
          {
            id: "schedule",
            name: "一轮复习进度表",
            subtitle: "按人教版教材六大模块、章、节精确规划的周课时进度安排",
            sampleFiles: [
              {
                id: "plan_1",
                name: "《2025-2026学年高三物理一轮复习总课时进度与周计划安排表(精确到人教版小节)》.xlsx",
                type: "xlsx",
                size: "1.2 MB",
                tag: "高三一轮大表",
                author: "张老师(备课组长)",
                date: "2025-09-01",
                downloads: 215,
                keypoints: ["必修一动力学(4周/19节)", "必修二能量与天体(5周/18节)", "选必二电磁学(6周/20节)"],
                previewContent: `<h4>高三物理一轮复习周历与小节进度表</h4><p>第1-4周：必修一 1.1~4.6 质点运动学与牛顿运动定律全章节；<br>第5-9周：必修二 5.1~8.5 抛体、圆周、万有引力与机械能守恒定律；<br>第10-15周：选必二 1.1~3.4 磁场、电磁感应与交变电流大单元。</p>`
              },
              {
                id: "plan_2",
                name: "《高三物理必修与选必21个学生必做分组实验开出时间表与实验室预约单》.pdf",
                type: "pdf",
                size: "2.8 MB",
                tag: "实验预约",
                author: "物理实验员",
                date: "2025-08-29",
                downloads: 88,
                keypoints: ["验证牛顿第二定律", "测定金属电阻率", "验证动量守恒"],
                previewContent: `<h4>高中物理人教版必做实验计划</h4><p>统筹安排必修一打点计时器实验、选必一单摆测g及选必二伏安法测电阻实验。</p>`
              }
            ]
          }
        ]
      },
      goals: {
        id: "goals",
        name: "3. 教学目标评估",
        icon: "🎯",
        desc: "物理核心素养评价量规、随堂反馈诊断与达成度数据跟踪",
        subtabs: [
          {
            id: "competence",
            name: "核心素养达标",
            subtitle: "物理观念、科学思维、科学探究与科学态度四维评价体系",
            hasChart: "radarWeakpoints",
            sampleFiles: [
              {
                id: "goal_1",
                name: "《高中物理人教版新课标四维核心素养课堂达标评价量规表(小节细化版)》.xlsx",
                type: "xlsx",
                size: "1.8 MB",
                tag: "素养评价",
                author: "市教研室",
                date: "2025-08-28",
                downloads: 145,
                keypoints: ["物理观念", "科学思维", "科学探究", "科学态度与责任"],
                previewContent: `<h4>高中物理核心素养四维评价指南</h4><p>对接人教版教材每一小节教学目标，设立课堂五级表现性评价量规与达标检测题库。</p>`
              }
            ]
          }
        ]
      },
      analytics: {
        id: "analytics",
        name: "4. 班级成绩分析",
        icon: "📊",
        desc: "阶段考试小分段统计、班级对比、赋分模拟与考点易错谱系",
        subtabs: [
          {
            id: "exams",
            name: "阶段考试分析",
            subtitle: "摸底考/联考成绩单导入、难度系数与正态分布",
            hasChart: "examDistribution",
            sampleFiles: [
              {
                id: "ana_1",
                name: "《2025年高三八省名校联考物理小分统计与班级对比明细表(人教版考点溯源)》.xlsx",
                type: "xlsx",
                size: "3.2 MB",
                tag: "联考大数据",
                author: "数据中心",
                date: "2025-09-04",
                downloads: 310,
                keypoints: ["1班均分84.2", "4班均分79.6", "力学综合失分归因"],
                previewContent: `<h4>高三八省联考物理数据快报</h4><p>高三(1)班平均分 84.2分，必修一牛顿运动定律得分率 91.5%，选必二电磁感应大题得分率 64.2%。</p>`
              }
            ]
          }
        ]
      },
      students: {
        id: "students",
        name: "5. 学生重点跟进",
        icon: "👥",
        desc: "拔尖培优档案、强基计划辅导、临界生提分处方单",
        subtabs: [
          {
            id: "top",
            name: "拔尖培优档案",
            subtitle: "90分以上拔尖生思维进阶与物理竞赛强基指导档案",
            sampleFiles: [
              {
                id: "stu_1",
                name: "《高三(1)班物理拔尖生(前6名)高观点思维进阶指导方案(微元法与等效场)》.docx",
                type: "docx",
                size: "5.1 MB",
                tag: "强基培优",
                author: "张老师",
                date: "2025-09-02",
                downloads: 98,
                keypoints: ["微元法", "等效重力场", "非惯性系惯性力"],
                previewContent: `<h4>拔尖培优专题：等效法在复合场中的极速求解</h4><p>引入等效重力场加速度 g' = √(g² + (qE/m)²)，将带电粒子在匀强电场和重力场的复合运动直接降维为斜抛运动求解。</p>`
              }
            ]
          }
        ]
      },
      innovation: {
        id: "innovation",
        name: "6. 创新思路记录",
        icon: "💡",
        desc: "自制低成本教具方案、3D打印模型、STEAM跨学科融合项目",
        subtabs: [
          {
            id: "apparatus",
            name: "教具与自制实验",
            subtitle: "低成本自制教具制作指南、开源3D模型与专利",
            sampleFiles: [
              {
                id: "inn_1",
                name: "《基于智能手机加速度传感器的阻尼振动微型教具制作方案(配人教选必一)》.pdf",
                type: "pdf",
                size: "6.4 MB",
                tag: "自制教具获奖",
                author: "物理创新实验室",
                date: "2025-08-20",
                downloads: 185,
                keypoints: ["人教选必一2.5节", "Phyphox数据传输", "阻尼系数测定"],
                previewContent: `<h4>自制教具原理与物料清单</h4><p>配合人教版选择性必修第一册《简谐运动与阻尼振动》，直观绘制振动衰减曲线。</p>`
              }
            ]
          }
        ]
      },
      gaokao: {
        id: "gaokao",
        name: "7. 高考题目分析",
        icon: "🏆",
        desc: "历年新高考真题微专题拆解、命题情境化趋势与考向预测",
        subtabs: [
          {
            id: "trends",
            name: "命题趋势预测",
            subtitle: "2026年新高考命题双向细目表与前沿科技情境预测报告",
            hasChart: "gaokaoTrendsChart",
            sampleFiles: [
              {
                id: "gk_1",
                name: "《2026年新高考物理命题情境创新(人教版教材大概念对接)预测报告》.pdf",
                type: "pdf",
                size: "7.4 MB",
                tag: "前沿考向预测",
                author: "特级教师联合组",
                date: "2025-09-07",
                downloads: 540,
                keypoints: ["中国空间站对接", "全超导托卡马克", "电磁弹射技术"],
                previewContent: `<h4>2026高考物理新情境命题热点预测</h4><p>紧密对接人教版必修二万有引力与选必二电磁感应核心大概念，解析近年来高考压轴题的建模方法。</p>`
              }
            ]
          }
        ]
      }
    };

