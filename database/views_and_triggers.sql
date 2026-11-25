-- ==============================================================================
-- RAILWAY MANAGEMENT SYSTEM — STANDALONE VIEWS & TRIGGERS SCRIPT
-- Target RDBMS: Supabase PostgreSQL 15+
-- Non-destructive: Safe to execute on an existing database without dropping tables.
-- ==============================================================================

-- ==============================================================================
-- 1. DATABASE VIEWS (PostgreSQL Standard)
-- ==============================================================================

-- View 1: Complete Booking Details for PNR Lookup & Passenger History
CREATE OR REPLACE VIEW vw_booking_details AS
SELECT 
    th.PNR,
    th.Booking_Date,
    th.Total_Amount,
    th.User_ID,
    ua.Email AS Booker_Email,
    tr.Run_ID,
    tr.Service_Date,
    tr.Run_Status,
    t.Train_ID,
    t.Name AS Train_Name,
    t.Type AS Train_Type,
    fs.Station_Code AS From_Station_Code,
    fs.Name AS From_Station_Name,
    ts.Station_Code AS To_Station_Code,
    ts.Name AS To_Station_Name,
    td.Detail_ID,
    p.Passenger_ID,
    p.Name AS Passenger_Name,
    p.Age AS Passenger_Age,
    p.Gender AS Passenger_Gender,
    td.Current_Status AS Ticket_Status,
    c.Coach_Type,
    c.Coach_ID,
    s.Seat_Number,
    s.Physical_Condition AS Seat_Condition,
    pay.Payment_Status,
    pay.Transaction_ID
FROM Ticket_Header th
JOIN User_Account ua ON th.User_ID = ua.User_ID
JOIN Train_Run tr ON th.Run_ID = tr.Run_ID
JOIN Train t ON tr.Train_ID = t.Train_ID
JOIN Station fs ON th.From_Station_ID = fs.Station_ID
JOIN Station ts ON th.To_Station_ID = ts.Station_ID
JOIN Ticket_Detail td ON th.PNR = td.PNR
JOIN Passenger p ON td.Passenger_ID = p.Passenger_ID
LEFT JOIN Seat_Allocation sa ON td.Allocation_ID = sa.Allocation_ID
LEFT JOIN Seat s ON sa.Seat_ID = s.Seat_ID
LEFT JOIN Coach c ON s.Coach_ID = c.Coach_ID
LEFT JOIN (
    SELECT p1.PNR, p1.Payment_Status, p1.Transaction_ID
    FROM Payment p1
    INNER JOIN (
        SELECT PNR, MAX(Transaction_ID) AS MaxTx
        FROM Payment
        GROUP BY PNR
    ) p2 ON p1.PNR = p2.PNR AND p1.Transaction_ID = p2.MaxTx
) pay ON th.PNR = pay.PNR;

-- View 2: Train Run Occupancy Statistics (Including Blocked / Maintenance Seats)
CREATE OR REPLACE VIEW vw_train_occupancy AS
SELECT 
    tr.Run_ID,
    tr.Service_Date,
    tr.Run_Status,
    t.Train_ID,
    t.Name AS Train_Name,
    t.Type AS Train_Type,
    COUNT(sa.Allocation_ID)::int AS Total_Seats,
    SUM(CASE WHEN sa.Booking_Status = 'BOOKED' THEN 1 ELSE 0 END)::int AS Booked_Seats,
    SUM(CASE WHEN sa.Booking_Status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS Available_Seats,
    SUM(CASE WHEN sa.Booking_Status = 'BLOCKED' THEN 1 ELSE 0 END)::int AS Blocked_Seats,
    ROUND(
        (SUM(CASE WHEN sa.Booking_Status = 'BOOKED' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(sa.Allocation_ID), 0), 2
    ) AS Occupancy_Percentage
FROM Train_Run tr
JOIN Train t ON tr.Train_ID = t.Train_ID
LEFT JOIN Seat_Allocation sa ON tr.Run_ID = sa.Run_ID
GROUP BY tr.Run_ID, tr.Service_Date, tr.Run_Status, t.Train_ID, t.Name, t.Type;

-- View 3: Train Revenue Summary (Gross, Refunded & Net Revenue)
CREATE OR REPLACE VIEW vw_revenue_summary AS
SELECT 
    t.Train_ID,
    t.Name AS Train_Name,
    t.Type AS Train_Type,
    tr.Service_Date,
    COUNT(DISTINCT th.PNR)::int AS Confirmed_Bookings_Count,
    COALESCE(SUM(CASE WHEN p.Payment_Status = 'SUCCESS' THEN p.Amount ELSE 0 END), 0.00) AS Total_Revenue,
    COALESCE(SUM(CASE WHEN p.Payment_Status = 'REFUNDED' THEN p.Amount ELSE 0 END), 0.00) AS Refunded_Amount,
    COALESCE(SUM(CASE WHEN p.Payment_Status = 'SUCCESS' THEN p.Amount WHEN p.Payment_Status = 'REFUNDED' THEN -p.Amount ELSE 0 END), 0.00) AS Net_Revenue
FROM Train t
JOIN Train_Run tr ON t.Train_ID = tr.Train_ID
LEFT JOIN Ticket_Header th ON tr.Run_ID = th.Run_ID
LEFT JOIN Payment p ON th.PNR = p.PNR
GROUP BY t.Train_ID, t.Name, t.Type, tr.Service_Date;

-- View 4: Ordered Train Route Timetable
CREATE OR REPLACE VIEW vw_route_timetable AS
SELECT
    t.Train_ID,
    t.Name AS Train_Name,
    t.Type AS Train_Type,
    rs.Schedule_ID,
    rs.Stop_Sequence,
    s.Station_ID,
    s.Station_Code,
    s.Name AS Station_Name,
    s.City,
    s.State,
    rs.Arrival_Time,
    rs.Departure_Time
FROM Train t
JOIN Route_Schedule rs ON t.Train_ID = rs.Train_ID
JOIN Station s ON rs.Station_ID = s.Station_ID
ORDER BY t.Train_ID ASC, rs.Stop_Sequence ASC;

-- View 5: Enriched System Audit Trail
CREATE OR REPLACE VIEW vw_audit_trail AS
SELECT
    al.Log_ID,
    al.Action_Type,
    al.Table_Affected,
    al.Created_At,
    al.User_ID,
    ua.Email AS User_Email,
    ua.Role AS User_Role
FROM Audit_Log al
LEFT JOIN User_Account ua ON al.User_ID = ua.User_ID;

-- ==============================================================================
-- 2. DATABASE TRIGGERS (PostgreSQL PL/pgSQL)
-- ==============================================================================

-- Trigger 1: Automatically log audit entry on seat allocation status transitions
CREATE OR REPLACE FUNCTION fn_seat_allocation_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.Booking_Status IS DISTINCT FROM NEW.Booking_Status THEN
        INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID)
        VALUES (
            'SEAT_STATUS_' || OLD.Booking_Status || '_TO_' || NEW.Booking_Status,
            'Seat_Allocation',
            CURRENT_TIMESTAMP,
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seat_allocation_audit ON Seat_Allocation;
CREATE TRIGGER trg_seat_allocation_audit
AFTER UPDATE ON Seat_Allocation
FOR EACH ROW
EXECUTE FUNCTION fn_seat_allocation_audit();

-- Trigger 2: Automatically log audit entry on payment creation
CREATE OR REPLACE FUNCTION fn_payment_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID)
    VALUES (
        LEFT('PAYMENT_' || NEW.Payment_Status || '_' || NEW.PNR, 50),
        'Payment',
        CURRENT_TIMESTAMP,
        NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_audit ON Payment;
CREATE TRIGGER trg_payment_audit
AFTER INSERT ON Payment
FOR EACH ROW
EXECUTE FUNCTION fn_payment_audit();

-- Trigger 3: Synchronize Seat_Allocation availability when physical Seat condition changes
CREATE OR REPLACE FUNCTION fn_sync_seat_condition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.Physical_Condition IS DISTINCT FROM NEW.Physical_Condition THEN
        IF NEW.Physical_Condition = 'UNDER_REPAIR' THEN
            UPDATE Seat_Allocation
            SET Booking_Status = 'BLOCKED'
            WHERE Seat_ID = NEW.Seat_ID AND Booking_Status = 'AVAILABLE';

            INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID)
            VALUES ('TRG_SEAT_REPAIR_BLOCKED_' || NEW.Seat_Number, 'Seat', CURRENT_TIMESTAMP, NULL);
        ELSIF NEW.Physical_Condition = 'OPERATIONAL' THEN
            UPDATE Seat_Allocation
            SET Booking_Status = 'AVAILABLE'
            WHERE Seat_ID = NEW.Seat_ID AND Booking_Status = 'BLOCKED';

            INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID)
            VALUES ('TRG_SEAT_REPAIR_RESTORED_' || NEW.Seat_Number, 'Seat', CURRENT_TIMESTAMP, NULL);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_seat_condition ON Seat;
CREATE TRIGGER trg_sync_seat_condition
AFTER UPDATE OF Physical_Condition ON Seat
FOR EACH ROW
EXECUTE FUNCTION fn_sync_seat_condition();

-- Trigger 4: Prevent booking a seat that is physically UNDER_REPAIR
CREATE OR REPLACE FUNCTION fn_prevent_repair_seat_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_condition VARCHAR(30);
BEGIN
    IF NEW.Booking_Status = 'BOOKED' THEN
        SELECT Physical_Condition INTO v_condition
        FROM Seat
        WHERE Seat_ID = NEW.Seat_ID;

        IF v_condition = 'UNDER_REPAIR' THEN
            RAISE EXCEPTION 'Integrity Violation: Seat_ID % is UNDER_REPAIR and cannot be BOOKED.', NEW.Seat_ID;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_repair_seat_booking ON Seat_Allocation;
CREATE TRIGGER trg_prevent_repair_seat_booking
BEFORE INSERT OR UPDATE OF Booking_Status ON Seat_Allocation
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_repair_seat_booking();

-- Trigger 5: Automatically audit Train_Run status changes (e.g., SCHEDULED -> DELAYED / RUNNING / CANCELLED)
CREATE OR REPLACE FUNCTION fn_train_run_status_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.Run_Status IS DISTINCT FROM NEW.Run_Status THEN
        INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID)
        VALUES (
            LEFT('RUN_STATUS_' || OLD.Run_Status || '_TO_' || NEW.Run_Status, 50),
            'Train_Run',
            CURRENT_TIMESTAMP,
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_train_run_status_audit ON Train_Run;
CREATE TRIGGER trg_train_run_status_audit
AFTER UPDATE OF Run_Status ON Train_Run
FOR EACH ROW
EXECUTE FUNCTION fn_train_run_status_audit();

-- Trigger 6: Enforce distinct Source_ID and Destination_ID on Train master records
CREATE OR REPLACE FUNCTION fn_validate_train_stations()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.Source_ID = NEW.Destination_ID THEN
        RAISE EXCEPTION 'Integrity Violation: Train Source_ID (%) and Destination_ID (%) must be distinct.', NEW.Source_ID, NEW.Destination_ID;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_train_stations ON Train;
CREATE TRIGGER trg_validate_train_stations
BEFORE INSERT OR UPDATE OF Source_ID, Destination_ID ON Train
FOR EACH ROW
EXECUTE FUNCTION fn_validate_train_stations();

