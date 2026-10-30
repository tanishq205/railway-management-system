import React, { useState } from 'react';
import { Terminal, Copy, Check, BookOpen } from 'lucide-react';

const VIVA_QUERIES = [
  {
    id: 1,
    concept: '1. INNER JOIN',
    title: 'Train Route Schedules & Station Sequence',
    description: 'Retrieves the complete route itinerary for each train in ascending Stop_Sequence order, mapping foreign keys to Station entity details.',
    sql: `SELECT 
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
ORDER BY t.Train_ID, rs.Stop_Sequence ASC;`
  },
  {
    id: 2,
    concept: '2. LEFT JOIN',
    title: 'Trains Fleet With or Without Bookings',
    description: 'Lists all physical trains whether or not any passenger has reserved a ticket for them yet (preserves unbooked trains).',
    sql: `SELECT 
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
ORDER BY t.Train_ID;`
  },
  {
    id: 3,
    concept: '3. RIGHT JOIN',
    title: 'Stations and Route Participation',
    description: 'Includes all stations in the database and identifies which ones participate in train routes versus inactive stations.',
    sql: `SELECT 
    s.Station_ID,
    s.Station_Code,
    s.Name AS Station_Name,
    s.City,
    rs.Train_ID,
    rs.Stop_Sequence
FROM Route_Schedule rs
RIGHT JOIN Station s ON rs.Station_ID = s.Station_ID
ORDER BY s.Station_ID;`
  },
  {
    id: 4,
    concept: '4. Multi-Table JOIN (7 Tables)',
    title: 'Comprehensive Passenger Ticket Itinerary',
    description: 'Joins Ticket_Header, Train_Run, Train, Station (From/To), Ticket_Detail, Passenger, Seat_Allocation, Seat, Coach, and Payment for complete PNR resolution.',
    sql: `SELECT 
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
WHERE th.PNR = 'PNR8492013';`
  },
  {
    id: 5,
    concept: '5. Nested Subquery',
    title: 'High-Value Passengers Above Average Ticket Fare',
    description: 'Identifies passengers traveling on bookings where the Total_Amount exceeds the fleet average ticket reservation value.',
    sql: `SELECT 
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
);`
  },
  {
    id: 6,
    concept: '6. GROUP BY & HAVING',
    title: 'Occupancy Aggregation Above Threshold',
    description: 'Calculates occupancy rates and filters train runs that have at least one confirmed booking using the HAVING clause.',
    sql: `SELECT 
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
HAVING Booked_Seats > 0;`
  },
  {
    id: 7,
    concept: '7. Aggregate Functions',
    title: 'Financial & Ticketing Metrics (COUNT, SUM, AVG, MIN, MAX)',
    description: 'Summary calculations across all tickets booked in the system.',
    sql: `SELECT 
    COUNT(DISTINCT PNR) AS Total_Bookings,
    SUM(Total_Amount) AS Total_Gross_Booking_Value,
    ROUND(AVG(Total_Amount), 2) AS Average_Ticket_Fare,
    MIN(Total_Amount) AS Minimum_Fare,
    MAX(Total_Amount) AS Maximum_Fare
FROM Ticket_Header;`
  },
  {
    id: 8,
    concept: '8. UPDATE Operation',
    title: 'Train Running Status Update',
    description: 'Modifies runtime operational state for a scheduled train run.',
    sql: `UPDATE Train_Run
SET Run_Status = 'RUNNING'
WHERE Run_ID = 1;`
  },
  {
    id: 9,
    concept: '9. DELETE with Referential Integrity',
    title: 'Safe Record Deletion Respecting Foreign Keys',
    description: 'Demonstrates cascading and restrict rules when safely creating and purging an unreferenced master record.',
    sql: `INSERT INTO Station (Station_Code, Name, City, State) 
VALUES ('TESTSTN', 'Temporary Test Station', 'TestCity', 'TestState');

-- Verify insertion:
SELECT * FROM Station WHERE Station_Code = 'TESTSTN';

-- Delete safely without violating any foreign keys:
DELETE FROM Station WHERE Station_Code = 'TESTSTN';`
  },
  {
    id: 10,
    concept: '10. ACID Transaction & Pessimistic Locking',
    title: 'Transactional Seat Booking with SELECT ... FOR UPDATE',
    description: 'InnoDB exclusive row locks to prevent race conditions and double-booking during concurrent ticket reservations.',
    sql: `START TRANSACTION;

-- Lock available seat in Run_ID = 1
SELECT Allocation_ID, Run_ID, Seat_ID, Booking_Status 
FROM Seat_Allocation 
WHERE Run_ID = 1 AND Booking_Status = 'AVAILABLE' 
LIMIT 1 
FOR UPDATE;

-- Mark as BOOKED
UPDATE Seat_Allocation 
SET Booking_Status = 'BOOKED' 
WHERE Allocation_ID = 3;

-- Insert audit entry
INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID)
VALUES ('TRANSACTION_DEMO_BOOKING', 'Seat_Allocation', NOW(), 1);

COMMIT;`
  },
  {
    id: 11,
    concept: '11. Database Triggers',
    title: 'Automated Audit Logging Trigger',
    description: 'Demonstrates MySQL trigger trg_seat_allocation_audit automatically populating Audit_Log when seat booking status changes.',
    sql: `-- Updating seat allocation fires trigger trg_seat_allocation_audit:
UPDATE Seat_Allocation
SET Booking_Status = 'AVAILABLE'
WHERE Allocation_ID = 3;

-- Query the auto-inserted audit record:
SELECT * FROM Audit_Log 
WHERE Table_Affected = 'Seat_Allocation'
ORDER BY Created_At DESC
LIMIT 5;`
  },
  {
    id: 12,
    concept: '12. SQL Views',
    title: 'Querying Predefined vw_booking_details View',
    description: 'Encapsulates complex joins for fast PNR resolution and reporting.',
    sql: `SELECT 
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
WHERE PNR = 'PNR8492013';`
  },
  {
    id: 13,
    concept: '13. Date Filtering',
    title: 'Scheduled Train Runs for Given Service Date',
    description: 'Retrieves all trains operating on a specific journey date.',
    sql: `SELECT 
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
WHERE tr.Service_Date = '2026-10-30';`
  },
  {
    id: 14,
    concept: '14. Revenue Reports',
    title: 'Aggregated Revenue Grouped by Train & Date',
    description: 'Total successful revenue settlements by train service.',
    sql: `SELECT 
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
ORDER BY Total_Revenue_INR DESC;`
  },
  {
    id: 15,
    concept: '15. Operational Capacity vs Maintenance',
    title: 'Occupancy vs Under Repair Fleet Ratio',
    description: 'Contrasts physical seats under repair against operational seat capacity and booked passenger allocations.',
    sql: `SELECT 
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
GROUP BY t.Name, tr.Run_ID, tr.Service_Date;`
  }
];

export default function VivaQueries() {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, sql) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Terminal size={24} style={{ color: 'var(--rail-red)' }} />
          DBMS Viva Demonstration SQL Queries
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Executable queries covering all 15 required relational database evaluation concepts from <code>database/demo_queries.sql</code>.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {VIVA_QUERIES.map((q) => (
          <div key={q.id} className="card">
            <div className="card-header" style={{ background: 'var(--bg-card-subtle)' }}>
              <div>
                <span className="badge badge-operational" style={{ marginBottom: '4px' }}>
                  {q.concept}
                </span>
                <h3 className="card-title" style={{ fontSize: '1.15rem' }}>
                  {q.title}
                </h3>
              </div>
              <button
                onClick={() => handleCopy(q.id, q.sql)}
                className="btn btn-outline btn-sm"
              >
                {copiedId === q.id ? <Check size={14} style={{ color: 'var(--confirmed-green)' }} /> : <Copy size={14} />}
                <span>{copiedId === q.id ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {q.description}
              </p>
              <pre style={{
                background: '#0a1f38',
                color: '#e2e8f0',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                overflowX: 'auto',
                fontSize: '0.85rem',
                fontFamily: 'Consolas, Monaco, monospace',
                lineHeight: 1.45
              }}>
                <code>{q.sql}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
