# Entity-Relationship (ER) Diagram

This document contains the Entity-Relationship (ER) model for the **Railway Management System**, modeling all 13 tables, primary keys, foreign keys, and cardinalities.

## Mermaid ER Diagram

```mermaid
erDiagram
    Station ||--o{ Train : "originates / terminates"
    Station ||--o{ Route_Schedule : "serves as stop"
    Station ||--o{ Ticket_Header : "from / to station"

    Train ||--|{ Route_Schedule : "consists of stops"
    Train ||--|{ Coach : "composed of"
    Train ||--o{ Train_Run : "operates on dates"

    Coach ||--|{ Seat : "contains"

    Train_Run ||--|{ Seat_Allocation : "allocates"
    Seat ||--o{ Seat_Allocation : "inventory per run"

    User_Account ||--o{ Passenger : "manages travelers"
    User_Account ||--o{ Ticket_Header : "books tickets"
    User_Account ||--o{ Audit_Log : "triggers action"

    Train_Run ||--o{ Ticket_Header : "scheduled for"

    Ticket_Header ||--|{ Ticket_Detail : "has passenger items"
    Passenger ||--o{ Ticket_Detail : "is named in"
    Seat_Allocation ||--o| Ticket_Detail : "assigns seat"

    Ticket_Header ||--o{ Payment : "settled via"

    Station {
        int Station_ID PK
        varchar Station_Code UK
        varchar Name
        varchar City
        varchar State
    }

    Train {
        int Train_ID PK
        varchar Name
        varchar Type
        int Source_ID FK
        int Destination_ID FK
    }

    Route_Schedule {
        int Schedule_ID PK
        int Train_ID FK
        int Station_ID FK
        int Stop_Sequence
        time Arrival_Time
        time Departure_Time
    }

    Coach {
        int Coach_ID PK
        int Train_ID FK
        varchar Coach_Type
    }

    Seat {
        int Seat_ID PK
        int Coach_ID FK
        varchar Seat_Number
        varchar Physical_Condition
    }

    Train_Run {
        int Run_ID PK
        int Train_ID FK
        date Service_Date
        varchar Run_Status
    }

    Seat_Allocation {
        int Allocation_ID PK
        int Run_ID FK
        int Seat_ID FK
        varchar Booking_Status
    }

    User_Account {
        int User_ID PK
        varchar Email UK
        varchar Password_Hash
        varchar Role
        timestamp Created_At
    }

    Passenger {
        int Passenger_ID PK
        int User_ID FK
        varchar Name
        int Age
        varchar Gender
    }

    Ticket_Header {
        varchar PNR PK
        int User_ID FK
        int Run_ID FK
        int From_Station_ID FK
        int To_Station_ID FK
        datetime Booking_Date
        decimal Total_Amount
    }

    Ticket_Detail {
        int Detail_ID PK
        varchar PNR FK
        int Passenger_ID FK
        int Allocation_ID FK
        varchar Current_Status
    }

    Payment {
        int Transaction_ID PK
        varchar PNR FK
        decimal Amount
        varchar Payment_Status
        datetime Timestamp
    }

    Audit_Log {
        int Log_ID PK
        varchar Action_Type
        varchar Table_Affected
        datetime Created_At
        int User_ID FK
    }
```

## Relational Cardinalities and Business Rules
1. **Station to Train (1:N)**: A station acts as the `Source` or `Destination` for multiple trains.
2. **Train to Route_Schedule (1:N)**: A train follows an ordered sequence of stations identified by `Stop_Sequence`.
3. **Train to Coach (1:N) & Coach to Seat (1:N)**: Physical rolling stock hierarchy. Coach capacity is dynamically derived by counting seats.
4. **Train to Train_Run (1:N)**: A physical train entity is instantiated on specific service dates as a `Train_Run`.
5. **Seat & Train_Run to Seat_Allocation (N:1 & M:N)**: A `Seat_Allocation` maps a physical seat to a train run, isolating per-date booking state (`AVAILABLE`, `BOOKED`, `BLOCKED`).
6. **User_Account to Ticket_Header (1:N)**: A registered passenger creates bookings identified by a unique 10-character `PNR`.
7. **Ticket_Header to Ticket_Detail (1:N)**: Master-detail reservation pattern supporting multi-passenger bookings.
8. **Ticket_Header to Payment (1:N)**: Supports multiple payment attempts (e.g., failure retry) per PNR.
9. **Seat_Allocation to Ticket_Detail (1:0..1)**: Waitlisted tickets have a `NULL` `Allocation_ID` until promoted.
