-- 除湿机数据
INSERT INTO dehumidifier (name, code, defrost_interval_hours, last_defrost_at, status, cooling_zone) VALUES
('一号除湿机', 'DH-001', 72, NOW() - INTERVAL '80 hours', 'pending_defrost', 'A区1-5列'),
('二号除湿机', 'DH-002', 72, NOW() - INTERVAL '36 hours', 'normal', 'A区6-10列'),
('三号除湿机', 'DH-003', 48, NOW() - INTERVAL '55 hours', 'normal', 'B区1-5列');

-- 湿度数据（72小时，每小时一条）
-- DH-001: 最后3条 > 58%
INSERT INTO humidity_record (dehumidifier_id, humidity, recorded_at)
SELECT 
    1,
    CASE 
        WHEN i < 70 THEN ROUND((55 + (random()*3))::numeric, 2)
        ELSE ROUND((59 + (random()*2))::numeric, 2)
    END,
    NOW() - INTERVAL '1 hour' * (72 - i)
FROM generate_series(1, 72) AS i;

-- DH-002: 正常湿度数据
INSERT INTO humidity_record (dehumidifier_id, humidity, recorded_at)
SELECT 
    2,
    ROUND((52 + (random()*4))::numeric, 2),
    NOW() - INTERVAL '1 hour' * (72 - i)
FROM generate_series(1, 72) AS i;

-- DH-003: 正常湿度数据
INSERT INTO humidity_record (dehumidifier_id, humidity, recorded_at)
SELECT 
    3,
    ROUND((50 + (random()*5))::numeric, 2),
    NOW() - INTERVAL '1 hour' * (72 - i)
FROM generate_series(1, 72) AS i;

-- 藏品批次
INSERT INTO collection_batch (batch_no, name, dehumidifier_id) VALUES
('BAT-2024-001', '清代古籍善本-经部', 1),
('BAT-2024-002', '民国档案-政府公文', 1),
('BAT-2024-003', '老照片集-1950s', 2),
('BAT-2024-004', '地方志丛书-江南卷', 2),
('BAT-2024-005', '名人手札-近代作家', 3),
('BAT-2024-006', '报纸合订本-申报', 3);

-- 抽检记录
INSERT INTO inspection_record (collection_batch_id, paper_warp_mm, inspection_date, inspector_name) VALUES
(1, 1.2, '2024-01-15', '张三'),
(2, 0.8, '2024-01-16', '李四'),
(3, 2.1, '2024-01-17', '王五'),
(4, 0.5, '2024-01-18', '张三'),
(5, 1.5, '2024-01-19', '李四'),
(6, 1.0, '2024-01-20', '王五');

-- 除霜历史记录
INSERT INTO defrost_history (dehumidifier_id, completed_at, operator_name, remark) VALUES
(1, NOW() - INTERVAL '80 hours', '管理员A', '常规除霜'),
(1, NOW() - INTERVAL '152 hours', '管理员B', '定期维护'),
(2, NOW() - INTERVAL '36 hours', '管理员A', '常规除霜'),
(2, NOW() - INTERVAL '108 hours', '管理员C', '定期维护'),
(3, NOW() - INTERVAL '55 hours', '管理员B', '常规除霜'),
(3, NOW() - INTERVAL '103 hours', '管理员A', '定期维护');
