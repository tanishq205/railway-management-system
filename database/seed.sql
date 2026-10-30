-- ==============================================================================
-- RAILWAY MANAGEMENT SYSTEM — AUTHENTIC IRCTC SAMPLE DATA
-- Target RDBMS: Supabase PostgreSQL 15+
-- ==============================================================================

-- Clean all existing data safely
TRUNCATE TABLE 
    Audit_Log,
    Payment,
    Ticket_Detail,
    Ticket_Header,
    Passenger,
    User_Account,
    Seat_Allocation,
    Train_Run,
    Seat,
    Coach,
    Route_Schedule,
    Train,
    Station 
CASCADE;

-- ------------------------------------------------------------------------------
-- 1. STATIONS (18 Realistic Indian Railway Stations)
-- ------------------------------------------------------------------------------
INSERT INTO Station (Station_ID, Station_Code, Name, City, State) VALUES
(1, 'NDLS', 'New Delhi Railway Station', 'New Delhi', 'Delhi'),
(2, 'MMCT', 'Mumbai Central', 'Mumbai', 'Maharashtra'),
(3, 'HWH',  'Howrah Junction', 'Kolkata', 'West Bengal'),
(4, 'MAS',  'Chennai Central (MGR Central)', 'Chennai', 'Tamil Nadu'),
(5, 'SBC',  'KSR Bengaluru City', 'Bengaluru', 'Karnataka'),
(6, 'PNBE', 'Patna Junction', 'Patna', 'Bihar'),
(7, 'ADI',  'Ahmedabad Junction', 'Ahmedabad', 'Gujarat'),
(8, 'HYB',  'Hyderabad Deccan (Nampally)', 'Hyderabad', 'Telangana'),
(9, 'CNB',  'Kanpur Central', 'Kanpur', 'Uttar Pradesh'),
(10, 'BRC', 'Vadodara Junction', 'Vadodara', 'Gujarat'),
(11, 'BPL', 'Bhopal Junction', 'Bhopal', 'Madhya Pradesh'),
(12, 'BSB', 'Varanasi Junction (Cantonment)', 'Varanasi', 'Uttar Pradesh'),
(13, 'AGC', 'Agra Cantt', 'Agra', 'Uttar Pradesh'),
(14, 'PUNE', 'Pune Junction', 'Pune', 'Maharashtra'),
(15, 'LKO', 'Lucknow Charbagh', 'Lucknow', 'Uttar Pradesh'),
(16, 'JAT', 'Jammu Tawi', 'Jammu', 'Jammu & Kashmir'),
(17, 'GHY', 'Guwahati Junction', 'Guwahati', 'Assam'),
(18, 'TVC', 'Thiruvananthapuram Central', 'Thiruvananthapuram', 'Kerala');

-- ------------------------------------------------------------------------------
-- 2. TRAINS (8 Premier IRCTC Trains)
-- ------------------------------------------------------------------------------
INSERT INTO Train (Train_ID, Name, Type, Source_ID, Destination_ID) VALUES
(1, '12952 Mumbai Tejas Rajdhani Express', 'RAJDHANI', 1, 2),       -- NDLS -> MMCT
(2, '22436 Vande Bharat Express', 'VANDE_BHARAT', 1, 12],            -- NDLS -> BSB
(3, '12002 New Delhi Bhopal Shatabdi Express', 'SHATABDI', 1, 11),   -- NDLS -> BPL
(4, '12302 Howrah Rajdhani Express', 'RAJDHANI', 1, 3),              -- NDLS -> HWH
(5, '20608 Chennai - Bengaluru Vande Bharat', 'VANDE_BHARAT', 4, 5), -- MAS -> SBC
(6, '12260 Sealdah AC Duronto Express', 'DURONTO', 1, 3],            -- NDLS -> HWH
(7, '12138 Punjab Mail Superfast', 'SUPERFAST', 1, 2),               -- NDLS -> MMCT
(8, '12626 Kerala Superfast Express', 'SUPERFAST', 1, 18);           -- NDLS -> TVC

-- ------------------------------------------------------------------------------
-- 3. ROUTE SCHEDULES
-- ------------------------------------------------------------------------------
INSERT INTO Route_Schedule (Schedule_ID, Train_ID, Station_ID, Stop_Sequence, Arrival_Time, Departure_Time) VALUES
-- Train 1: 12952 Mumbai Tejas Rajdhani
(1, 1, 1, 1, NULL, '16:55:00'),
(2, 1, 10, 2, '03:45:00', '03:55:00'),
(3, 1, 2, 3, '08:35:00', NULL),

-- Train 2: 22436 Vande Bharat Express
(4, 2, 1, 1, NULL, '06:00:00'),
(5, 2, 9, 2, '10:08:00', '10:10:00'),
(6, 2, 12, 3, '14:00:00', NULL),

-- Train 3: 12002 Bhopal Shatabdi
(7, 3, 1, 1, NULL, '06:00:00'),
(8, 3, 13, 2, '07:50:00', '07:55:00'),
(9, 3, 11, 3, '14:40:00', NULL),

-- Train 4: 12302 Howrah Rajdhani
(10, 4, 1, 1, NULL, '16:50:00'),
(11, 4, 9, 2, '21:32:00', '21:37:00'),
(12, 4, 6, 3, '04:30:00', '04:40:00'),
(13, 4, 3, 4, '09:55:00', NULL),

-- Train 5: 20608 Chennai - Bengaluru Vande Bharat
(14, 5, 4, 1, NULL, '05:50:00'),
(15, 5, 5, 2, '10:20:00', NULL),

-- Train 6: 12260 Sealdah Duronto
(16, 6, 1, 1, NULL, '19:45:00'),
(17, 6, 9, 2, '00:35:00', '00:40:00'),
(18, 6, 3, 3, '12:45:00', NULL),

-- Train 7: 12138 Punjab Mail
(19, 7, 1, 1, NULL, '05:10:00'),
(20, 7, 13, 2, '07:45:00', '07:50:00'),
(21, 7, 11, 3, '16:35:00', '16:45:00'),
(22, 7, 2, 4, '07:35:00', NULL),

-- Train 8: 12626 Kerala Express
(23, 8, 1, 1, NULL, '20:10:00'),
(24, 8, 13, 2, '22:20:00', '22:25:00'),
(25, 8, 11, 3, '05:20:00', '05:25:00'),
(26, 8, 4, 4, '04:15:00', '04:40:00'),
(27, 8, 18, 5, '18:00:00', NULL);

-- ------------------------------------------------------------------------------
-- 4. COACHES (21 Realistic Coaches)
-- ------------------------------------------------------------------------------
INSERT INTO Coach (Coach_ID, Train_ID, Coach_Type) VALUES
-- Train 1: Mumbai Tejas Rajdhani
(1, 1, '1A'), (2, 1, '2A'), (3, 1, '3A'),
-- Train 2: Vande Bharat NDLS-BSB
(4, 2, 'EC'), (5, 2, 'CC'), (6, 2, 'CC'),
-- Train 3: Bhopal Shatabdi
(7, 3, 'EC'), (8, 3, 'CC'),
-- Train 4: Howrah Rajdhani
(9, 4, '1A'), (10, 4, '2A'), (11, 4, '3A'),
-- Train 5: Chennai Vande Bharat
(12, 5, 'EC'), (13, 5, 'CC'),
-- Train 6: Sealdah Duronto
(14, 6, '2A'), (15, 6, '3A'),
-- Train 7: Punjab Mail
(16, 7, '2A'), (17, 7, '3A'), (18, 7, 'SL'),
-- Train 8: Kerala Superfast
(19, 8, '2A'), (20, 8, '3A'), (21, 8, 'SL');

-- ------------------------------------------------------------------------------
-- 5. TRAIN RUNS
-- ------------------------------------------------------------------------------
INSERT INTO Train_Run (Run_ID, Train_ID, Service_Date, Run_Status) VALUES
(1, 1, '2026-10-30', 'SCHEDULED'),
(2, 2, '2026-10-30', 'SCHEDULED'),
(3, 3, '2026-10-30', 'SCHEDULED'),
(4, 4, '2026-10-30', 'SCHEDULED'),
(5, 5, '2026-10-30', 'SCHEDULED'),
(6, 6, '2026-10-30', 'SCHEDULED'),
(7, 7, '2026-10-30', 'SCHEDULED'),
(8, 8, '2026-10-30', 'SCHEDULED'),
(9, 1, '2026-10-31', 'SCHEDULED'),
(10, 2, '2026-10-31', 'SCHEDULED'),
(11, 3, '2026-10-31', 'SCHEDULED'),
(12, 4, '2026-10-31', 'SCHEDULED');

-- ------------------------------------------------------------------------------
-- 6. USER ACCOUNTS (Admin + Passengers)
-- ------------------------------------------------------------------------------
INSERT INTO User_Account (User_ID, Email, Password_Hash, Role) VALUES
(1, 'admin@railway.gov.in', '$2a$10$kuMM4OpP9xgBDKMwz3lE4eac0r4bQnvsJINCqAusTqaT2za1a/KNK', 'ADMIN'),
(2, 'rahul.sharma@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'),
(3, 'amit.kumar@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'),
(4, 'sneha.reddy@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'),
(5, 'ananya.iyer@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'),
(6, 'rajesh.patel@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'),
(7, 'vikram.malhotra@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER');

-- ------------------------------------------------------------------------------
-- 7. PASSENGER PROFILES
-- ------------------------------------------------------------------------------
INSERT INTO Passenger (Passenger_ID, User_ID, Name, Age, Gender) VALUES
(1, 2, 'Rahul Sharma', 32, 'MALE'),
(2, 2, 'Priya Sharma', 29, 'FEMALE'),
(3, 3, 'Amit Kumar Verma', 26, 'MALE'),
(4, 4, 'Sneha Reddy', 28, 'FEMALE'),
(5, 5, 'Ananya Iyer', 24, 'FEMALE'),
(6, 6, 'Rajesh Patel', 45, 'MALE'),
(7, 7, 'Vikram Malhotra', 52, 'MALE'),
(8, 2, 'Aditya Sharma', 60, 'MALE');

-- ------------------------------------------------------------------------------
-- 8. TICKET HEADERS
-- ------------------------------------------------------------------------------
INSERT INTO Ticket_Header (PNR, User_ID, Run_ID, From_Station_ID, To_Station_ID, Booking_Date, Total_Amount) VALUES
('PNR8492013', 2, 1, 1, 2, '2026-10-28 14:30:00+05:30', 4840.00),
('PNR4420193', 5, 2, 1, 12, '2026-10-29 11:20:00+05:30', 1650.00),
('PNR5102948', 3, 5, 4, 5, '2026-10-29 09:15:00+05:30', 1250.00),
('PNR7381920', 4, 1, 1, 2, '2026-10-29 18:45:00+05:30', 2420.00),
('PNR9920145', 7, 6, 1, 3, '2026-10-27 10:10:00+05:30', 2100.00);

-- ------------------------------------------------------------------------------
-- 9. TICKET DETAILS
-- ------------------------------------------------------------------------------
INSERT INTO Ticket_Detail (Detail_ID, PNR, Passenger_ID, Allocation_ID, Current_Status) VALUES
(1, 'PNR8492013', 1, 1, 'CONFIRMED'),
(2, 'PNR8492013', 2, 2, 'CONFIRMED'),
(3, 'PNR4420193', 5, 19, 'CONFIRMED'),
(4, 'PNR5102948', 3, 73, 'CONFIRMED'),
(5, 'PNR7381920', 4, NULL, 'WAITLIST'),
(6, 'PNR9920145', 7, NULL, 'CANCELLED');

-- ------------------------------------------------------------------------------
-- 10. PAYMENTS
-- ------------------------------------------------------------------------------
INSERT INTO Payment (Transaction_ID, PNR, Amount, Payment_Status, Timestamp) VALUES
(1, 'PNR8492013', 4840.00, 'SUCCESS', '2026-10-28 14:31:05+05:30'),
(2, 'PNR4420193', 1650.00, 'SUCCESS', '2026-10-29 11:21:10+05:30'),
(3, 'PNR5102948', 1250.00, 'SUCCESS', '2026-10-29 09:16:12+05:30'),
(4, 'PNR7381920', 2420.00, 'SUCCESS', '2026-10-29 18:46:22+05:30'),
(5, 'PNR9920145', 2100.00, 'REFUNDED', '2026-10-27 10:12:00+05:30');

-- ------------------------------------------------------------------------------
-- 11. AUDIT LOGS
-- ------------------------------------------------------------------------------
INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID) VALUES
('ADMIN_LOGIN', 'User_Account', '2026-10-27 08:30:00+05:30', 1),
('STATION_REGISTERED_BSB', 'Station', '2026-10-27 08:45:00+05:30', 1),
('TRAIN_REGISTERED_VANDE_BHARAT', 'Train', '2026-10-27 09:00:00+05:30', 1),
('ROUTE_SCHEDULE_CONFIGURED', 'Route_Schedule', '2026-10-27 09:30:00+05:30', 1),
('SEAT_MAINTENANCE_BLOCKED', 'Seat', '2026-10-28 07:15:00+05:30', 1),
('TRAIN_RUN_SCHEDULED', 'Train_Run', '2026-10-28 08:00:00+05:30', 1),
('BOOKING_CONFIRMED', 'Ticket_Header', '2026-10-28 14:31:05+05:30', 2),
('PASSENGER_REGISTERED', 'Passenger', '2026-10-29 11:15:00+05:30', 5),
('PAYMENT_SUCCESS', 'Payment', '2026-10-29 11:21:10+05:30', 5),
('BOOKING_CANCELLED', 'Ticket_Detail', '2026-10-29 16:00:00+05:30', 7),
('PAYMENT_REFUNDED', 'Payment', '2026-10-29 16:01:00+05:30', 1),
('ADMIN_INSPECTED_OCCUPANCY', 'vw_train_occupancy', '2026-10-30 08:15:00+05:30', 1);

-- Synchronize Identity Sequences in PostgreSQL to highest ID
SELECT setval(pg_get_serial_sequence('"station"', 'station_id'), coalesce(max("station_id"), 1)) FROM "station";
SELECT setval(pg_get_serial_sequence('"train"', 'train_id'), coalesce(max("train_id"), 1)) FROM "train";
SELECT setval(pg_get_serial_sequence('"route_schedule"', 'schedule_id'), coalesce(max("schedule_id"), 1)) FROM "route_schedule";
SELECT setval(pg_get_serial_sequence('"coach"', 'coach_id'), coalesce(max("coach_id"), 1)) FROM "coach";
SELECT setval(pg_get_serial_sequence('"seat"', 'seat_id'), coalesce(max("seat_id"), 1)) FROM "seat";
SELECT setval(pg_get_serial_sequence('"train_run"', 'run_id'), coalesce(max("run_id"), 1)) FROM "train_run";
SELECT setval(pg_get_serial_sequence('"seat_allocation"', 'allocation_id'), coalesce(max("allocation_id"), 1)) FROM "seat_allocation";
SELECT setval(pg_get_serial_sequence('"user_account"', 'user_id'), coalesce(max("user_id"), 1)) FROM "user_account";
SELECT setval(pg_get_serial_sequence('"passenger"', 'passenger_id'), coalesce(max("passenger_id"), 1)) FROM "passenger";
SELECT setval(pg_get_serial_sequence('"ticket_detail"', 'detail_id'), coalesce(max("detail_id"), 1)) FROM "ticket_detail";
SELECT setval(pg_get_serial_sequence('"payment"', 'transaction_id'), coalesce(max("transaction_id"), 1)) FROM "payment";
SELECT setval(pg_get_serial_sequence('"audit_log"', 'log_id'), coalesce(max("log_id"), 1)) FROM "audit_log";
