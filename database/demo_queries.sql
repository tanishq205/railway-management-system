-- ==============================================================================
-- RAILWAY MANAGEMENT SYSTEM — DEMONSTRATION POSTGRESQL QUERIES (DBMS VIVA)
-- 15 categories of advanced queries for Supabase PostgreSQL:
-- JOINs, Subqueries, Aggregations, Views, Triggers, Transactions, MVCC & Row Locks.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. INNER JOIN: Retrieve train route stops along with station details in sequence
-- ------------------------------------------------------------------------------
SELECT 
    t.Train_ID,
    t.Name AS Train_Name,
    t.Type AS Train_Type,
    rs.Stop_Sequence,
    s.Station_Code,
    s.Name AS Station_Name,
    s.City,
    rs.Arrival_Time,
    rs.Departure_Time
FROM Train t
INNER JOIN Route_Schedule rs ON t.Train_ID = rs.Train_ID
INNER JOIN Station s ON rs.Station_ID = s.Station_ID
ORDER BY t.Train_ID, rs.Stop_Sequence ASC;

-- ------------------------------------------------------------------------------
-- 2. LEFT JOIN: List all trains and any associated ticket bookings (including unbooked trains)
-- ------------------------------------------------------------------------------
SELECT 
    t.Train_ID,
    t.Name AS Train_Name,
    tr.Run_ID,
    tr.Service_Date,
    th.PNR,
    th.Total_Amount,
    th.Booking_Date
FROM Train t
LEFT JOIN Train_Run tr ON t.Train_ID = tr.Train_ID
LEFT JOIN Ticket_Header th ON tr.Run_ID = th.Run_ID
ORDER BY t.Train_ID;

-- ------------------------------------------------------------------------------
-- 3. RIGHT JOIN: List all stations and check if they participate in any route schedule
-- ------------------------------------------------------------------------------
SELECT 
    s.Station_ID,
    s.Station_Code,
    s.Name AS Station_Name,
    s.City,
    rs.Train_ID,
    rs.Stop_Sequence
FROM Route_Schedule rs
RIGHT JOIN Station s ON rs.Station_ID = s.Station_ID
ORDER BY s.Station_ID;

-- ------------------------------------------------------------------------------
-- 4. MULTI-TABLE JOIN: Comprehensive PNR ticket itinerary and passenger seating
-- ------------------------------------------------------------------------------
SELECT 
    th.PNR,
    th.Booking_Date,
    t.Name AS Train_Name,
    t.Type AS Train_Type,
    tr.Service_Date,
    src.Station_Code AS From_Station,
    dest.Station_Code AS To_Station,
    p.Name AS Passenger_Name,
    p.Age AS Passenger_Age,
    p.Gender,
    c.Coach_Type,
    s.Seat_Number,
    td.Current_Status AS Ticket_Status,
    pay.Payment_Status
FROM Ticket_Header th
JOIN Train_Run tr ON th.Run_ID = tr.Run_ID
JOIN Train t ON tr.Train_ID = t.Train_ID
JOIN Station src ON th.From_Station_ID = src.Station_ID
JOIN Station dest ON th.To_Station_ID = dest.Station_ID
JOIN Ticket_Detail td ON th.PNR = td.PNR
JOIN Passenger p ON td.Passenger_ID = p.Passenger_ID
LEFT JOIN Seat_Allocation sa ON td.Allocation_ID = sa.Allocation_ID
LEFT JOIN Seat s ON sa.Seat_ID = s.Seat_ID
LEFT JOIN Coach c ON s.Coach_ID = c.Coach_ID
LEFT JOIN Payment pay ON th.PNR = pay.PNR
WHERE th.PNR = 'PNR8492013';

-- ------------------------------------------------------------------------------
-- 5. NESTED QUERY (SUBQUERY): Passengers traveling on bookings exceeding average ticket fare
-- ------------------------------------------------------------------------------
SELECT 
    p.Passenger_ID,
    p.Name AS Passenger_Name,
    p.Age,
    td.PNR,
    th.Total_Amount
FROM Passenger p
JOIN Ticket_Detail td ON p.Passenger_ID = td.Passenger_ID
JOIN Ticket_Header th ON td.PNR = th.PNR
WHERE th.Total_Amount > (
    SELECT AVG(Total_Amount) FROM Ticket_Header
);

-- ------------------------------------------------------------------------------
-- 6. GROUP BY & HAVING: Identify trains with occupancy above a threshold
-- ------------------------------------------------------------------------------
SELECT 
    t.Train_ID,
    t.Name AS Train_Name,
    tr.Service_Date,
    COUNT(sa.Allocation_ID) AS Total_Seats,
    SUM(CASE WHEN sa.Booking_Status = 'BOOKED' THEN 1 ELSE 0 END) AS Booked_Seats,
    ROUND((SUM(CASE WHEN sa.Booking_Status = 'BOOKED' THEN 1 ELSE 0 END) * 100.0) / COUNT(sa.Allocation_ID), 2) AS Occupancy_Rate
FROM Train t
JOIN Train_Run tr ON t.Train_ID = tr.Train_ID
JOIN Seat_Allocation sa ON tr.Run_ID = sa.Run_ID
GROUP BY t.Train_ID, t.Name, tr.Service_Date
HAVING SUM(CASE WHEN sa.Booking_Status = 'BOOKED' THEN 1 ELSE 0 END) > 0;

-- ------------------------------------------------------------------------------
-- 7. AGGREGATE FUNCTIONS: Summary metrics (COUNT, SUM, AVG, MIN, MAX)
-- ------------------------------------------------------------------------------
SELECT 
    COUNT(DISTINCT PNR) AS Total_Bookings,
    SUM(Total_Amount) AS Total_Gross_Booking_Value,
    ROUND(AVG(Total_Amount), 2) AS Average_Ticket_Fare,
    MIN(Total_Amount) AS Minimum_Fare,
    MAX(Total_Amount) AS Maximum_Fare
FROM Ticket_Header;

-- ------------------------------------------------------------------------------
-- 8. UPDATE: Update a train run status or delay
-- ------------------------------------------------------------------------------
UPDATE Train_Run
SET Run_Status = 'RUNNING'
WHERE Run_ID = 1;

-- ------------------------------------------------------------------------------
-- 9. DELETE: Safe removal of an unreferenced record adhering to referential integrity
-- ------------------------------------------------------------------------------
INSERT INTO Station (Station_Code, Name, City, State) 
VALUES ('TESTSTN', 'Temporary Test Station', 'TestCity', 'TestState');

-- Verify inserted record:
SELECT * FROM Station WHERE Station_Code = 'TESTSTN';

-- Safely delete it without violating foreign key constraints:
DELETE FROM Station WHERE Station_Code = 'TESTSTN';

-- ------------------------------------------------------------------------------
-- 10. POSTGRESQL TRANSACTION & ROW LOCKING (SELECT ... FOR UPDATE)
-- ------------------------------------------------------------------------------
BEGIN;

-- Lock available seat in Run_ID = 1 using pessimistic locking
SELECT Allocation_ID, Run_ID, Seat_ID, Booking_Status 
FROM Seat_Allocation 
WHERE Run_ID = 1 AND Booking_Status = 'AVAILABLE' 
LIMIT 1 
FOR UPDATE;

-- Mark the locked seat as BOOKED
UPDATE Seat_Allocation 
SET Booking_Status = 'BOOKED' 
WHERE Allocation_ID = 3;

-- Insert audit log entry
INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID)
VALUES ('TRANSACTION_DEMO_BOOKING', 'Seat_Allocation', CURRENT_TIMESTAMP, 1);

COMMIT;

-- ------------------------------------------------------------------------------
-- 11. TRIGGER DEMONSTRATION: Verification of automatic audit log entries
-- ------------------------------------------------------------------------------
UPDATE Seat_Allocation
SET Booking_Status = 'AVAILABLE'
WHERE Allocation_ID = 3;

-- Query the Audit_Log to observe the triggered insertion:
SELECT * FROM Audit_Log 
WHERE Table_Affected = 'Seat_Allocation'
ORDER BY Created_At DESC
LIMIT 5;

-- ------------------------------------------------------------------------------
-- 12. VIEW: Querying the predefined vw_booking_details view
-- ------------------------------------------------------------------------------
SELECT 
    PNR,
    Booker_Email,
    Train_Name,
    Service_Date,
    From_Station_Code,
    To_Station_Code,
    Passenger_Name,
    Coach_Type,
    Seat_Number,
    Ticket_Status,
    Payment_Status
FROM vw_booking_details
WHERE PNR = 'PNR8492013';

-- ------------------------------------------------------------------------------
-- 13. DATE FILTERING: Train runs scheduled for a specific journey date
-- ------------------------------------------------------------------------------
SELECT 
    tr.Run_ID,
    t.Name AS Train_Name,
    t.Type,
    s_src.Name AS Source_Station,
    s_dest.Name AS Destination_Station,
    tr.Service_Date,
    tr.Run_Status
FROM Train_Run tr
JOIN Train t ON tr.Train_ID = t.Train_ID
JOIN Station s_src ON t.Source_ID = s_src.Station_ID
JOIN Station s_dest ON t.Destination_ID = s_dest.Station_ID
WHERE tr.Service_Date = '2026-10-30';

-- ------------------------------------------------------------------------------
-- 14. REVENUE REPORT: Total successful payments grouped by train and service date
-- ------------------------------------------------------------------------------
SELECT 
    t.Train_ID,
    t.Name AS Train_Name,
    tr.Service_Date,
    COUNT(p.Transaction_ID) AS Total_Transactions,
    COALESCE(SUM(p.Amount), 0.00) AS Total_Revenue_INR
FROM Train t
JOIN Train_Run tr ON t.Train_ID = tr.Train_ID
LEFT JOIN Ticket_Header th ON tr.Run_ID = th.Run_ID
LEFT JOIN Payment p ON th.PNR = p.PNR AND p.Payment_Status = 'SUCCESS'
GROUP BY t.Train_ID, t.Name, tr.Service_Date
ORDER BY Total_Revenue_INR DESC;

-- ------------------------------------------------------------------------------
-- 15. OCCUPANCY REPORT: Operational seats vs booked seats vs maintenance
-- ------------------------------------------------------------------------------
SELECT 
    t.Name AS Train_Name,
    tr.Run_ID,
    tr.Service_Date,
    COUNT(s.Seat_ID) AS Total_Physical_Seats,
    SUM(CASE WHEN s.Physical_Condition = 'UNDER_REPAIR' THEN 1 ELSE 0 END) AS Under_Repair_Seats,
    SUM(CASE WHEN s.Physical_Condition = 'OPERATIONAL' THEN 1 ELSE 0 END) AS Operational_Seats,
    SUM(CASE WHEN sa.Booking_Status = 'BOOKED' THEN 1 ELSE 0 END) AS Booked_Seats,
    SUM(CASE WHEN sa.Booking_Status = 'AVAILABLE' THEN 1 ELSE 0 END) AS Available_Seats,
    ROUND((SUM(CASE WHEN sa.Booking_Status = 'BOOKED' THEN 1 ELSE 0 END) * 100.0) / 
          NULLIF(SUM(CASE WHEN s.Physical_Condition = 'OPERATIONAL' THEN 1 ELSE 0 END), 0), 2) AS Operational_Occupancy_Pct
FROM Train_Run tr
JOIN Train t ON tr.Train_ID = t.Train_ID
JOIN Coach c ON t.Train_ID = c.Train_ID
JOIN Seat s ON c.Coach_ID = s.Coach_ID
LEFT JOIN Seat_Allocation sa ON tr.Run_ID = sa.Run_ID AND s.Seat_ID = sa.Seat_ID
GROUP BY t.Name, tr.Run_ID, tr.Service_Date;
