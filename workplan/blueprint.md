# Architectural Blueprint: Next-Generation SESDC Toolkit

## Context

Access to electricity is not universal in the global south - unlike the norm in developed countries where access to high quality, reliable power is often taken for granted.  Over 700 million people lack access altogether and many more still depend on electricity that is significantly limited by quantity and reliability.

In remote regions, there are many obstacles to electricity access.  Rural electrification is stymied by high costs of service, low ability to pay, institutional/government structures, and because many solutions that were designed for developed markets are not appropriate for first access.

Mini-/micro-grids (MGs) and other off-grid solutions like solar home systems or point of use solar supply for productive uses offer a lower cost, and increasingly lowest cost, solution to traditional rural electrification efforts.

Rural MGs depend on the local community for support, both from a governance perspective, but also for practical operations.  The community is the main source of demand for the goods/services enabled by electricity access - they provide monies for the charging, lighting, agricultural processing, refrigeration, and other services that simultaneously drive transformational change.  Yet the ongoing survival of a MG project in this setting is precarious.  It can fail for any number of interrelated reasons, for example: insufficient revenue recovery, technical/equipment failures, poor ownership models, and loss of social support.  Strategic and practical operator decision making over the life of a project can prevent/mitigate some of the challenges and adapt to maximize the project’s performance.  For these projects the challenge of sustainability is the first order challenge in order to unlock the potential benefits such as widespread economic and human development.

What is needed
The first stage of a MG project is a pre-feasibility assessment - a review of the energy requirements, system requirements, and likely system and project configuration to meet requirements.

### Requirements
- Desired solution is a low-cost web-application that simulates a project energy and financial scenarios
- End-users are community members in the Global South with supporting organizations (NGOs) that may have little to no experience with energy projects
- End-user consumer technology (mobiles, computers) is limited in computational, storage, memory, and bandwidth.

---

## 1. Executive Summary & Vision
This document outlines the architecture for a scalable, cloud-native, agent-based platform for simulating decoupled energy projects. The primary vision is to create a powerful tool that is not only capable of complex, long-term energy modeling but is also accessible to users with limited computational resources.

The architecture is founded on four key principles:
- **Modularity**: The simulation core is composed of independent, swappable components, allowing for extensibility and clear separation of concerns.
- **Scalability**: The serverless cloud infrastructure automatically scales with demand, from zero to thousands of simulations, without manual intervention.
- **Performance**: A multi-layered optimization strategy ensures that both the core calculations and the end-user experience are fast and efficient.
- **Accessibility**: A "thin client, powerful server" model ensures that all computationally intensive work is performed in the cloud, making the tool accessible from any modern web browser, regardless of local device power.

## 2. System Architecture Overview
The system operates on a client-server model. A lightweight web frontend provides the user interface, while a powerful serverless backend handles all simulation and data processing tasks.

- **Client (The Browser)**: A modern web application allows users to configure simulation parameters, launch runs, and visualize results. It performs no calculations itself.
- **Server (Google Cloud)**: A suite of serverless services that work in concert:
    - An API layer receives requests from the client.
    - A long-running task service executes the core simulation.
    - A hybrid data storage system manages simulation metadata and results.
- **Data Flow**: The client sends small configuration requests to the server. The server runs the entire simulation, processes the massive result dataset, and returns only small, aggregated summaries to the client for visualization.

## 3. Frontend Architecture
- **Framework**: React or Vue.
    - *Rationale*: These modern JavaScript frameworks enable the creation of a rich, responsive, and component-based user interface. Their large ecosystems and strong community support are ideal for a student-led project.
- **Hosting**: Firebase Hosting.
    - *Rationale*: Firebase Hosting provides a simple, secure, and globally distributed CDN for the web application. Its seamless integration with the backend and generous free tier make it a cost-effective and low-maintenance choice.

## 4. Backend Architecture

### 4.1 Service Architecture
- **API Layer**: Cloud Functions for Firebase (Python).
    - *Rationale*: Cloud Functions act as the secure HTTP endpoints for the application. They are responsible for validating user requests, authenticating users, and initiating simulation tasks.
- **Long-Running Task Execution**: Google Cloud Run, triggered via Pub/Sub.
    - *Rationale*: Simulations will exceed the maximum timeout of a standard HTTP function. The "HTTP Function -> Pub/Sub -> Cloud Run" pattern is a robust solution for asynchronous background processing. Cloud Run provides a scalable, containerized environment for the core Python simulation with configurable timeouts and resources.

### 4.2 Simulation Core Architecture
The core simulation is a modular, event-driven Python application designed for flexibility and realism.
- **Simulation Engine**: The central "clock" that iterates through time steps and orchestrates the calls to all other components.
- **State Object**: A central data structure holding the "ground truth" of the entire system at a single point in time.
- **Component Models**: Independent modules representing the "physics" of the system (e.g., PV_Model, Battery_Model, Financial_Model).
- **Behavioral Agents**: The dynamic actors in the simulation (Operator_Agent, Customer_Agent). These agents make decisions and have learning mechanisms to adapt their behavior over time.
- **Comprehension Layer**: A derivative of the State object, unique to each agent, that models their subjective, potentially imperfect "perception" of reality. This enables modeling information latency, error, and bias.
- **Evaluative Agents**: "Read-only" agents that observe the simulation state and synthesize it into meaningful abstractions (e.g., "sustainability score," "financial health status"), separating analysis from simulation.
- **Event Scheduler**: A timeline used to inject discrete, scheduled events into the simulation, such as external economic shocks or planned equipment failures.

## 5. Data Architecture
A hybrid data model uses the best tool for each type of data, optimizing for speed, cost, and query capabilities.

- **Application Metadata (in Cloud Firestore)**:
    - *Rationale*: Firestore is a NoSQL document database perfect for storing the small, frequently accessed data related to each simulation run (user inputs, status, summary KPIs, and agent learning states). Its real-time capabilities can be used to push live status updates to the web app.
- **Time-Series Results (in Google BigQuery)**:
    - *Rationale*: BigQuery is a serverless data warehouse built for analyzing massive datasets. The raw hourly time-series data from every simulation will be streamed into a single, unified table. This table will be partitioned by time and clustered by simulation_run_id to ensure that analytical queries are extremely fast and cost-effective.

## 6. Performance & Optimization Strategy

### Core Calculation Speed
- **Vectorization (NumPy/Pandas)**: Used for all non-state-dependent calculations to leverage pre-compiled C code for massive speed gains.
- **JIT Compilation (Numba)**: Used on state-dependent for loops (e.g., battery dispatch) to compile them into optimized machine code at runtime.

### Scenario Throughput
- **Parallelization (multiprocessing)**: The Run Manager will use this to execute multiple simulation scenarios in parallel on multi-core Cloud Run instances, drastically reducing the time required for sensitivity analysis.

### End-User Experience
- **Server-Side Aggregation**: All queries against the large BigQuery dataset are performed on the server. The backend sends only small, pre-aggregated data to the client, ensuring a responsive experience even on low-bandwidth connections.

## 7. Phased Implementation Plan

### Phase 0: Structural Alignment (Migration of Current Codebase)
*Goal: Establish the infrastructure and data pipelines required by the blueprint.*
- **Data Pipeline**: Implement the streaming of raw simulation results from the backend into **Google BigQuery**.
- **Asynchronous Infrastructure**: Configure the **Pub/Sub** topic and **Cloud Run** service to handle the "Long-Running Task" execution.
- **Metadata Schema**: Standardize the **Firestore** schema to hold simulation metadata and high-level KPIs (instead of just returning CSV blobs).

### Phase 1: Core Engine & MVP
*Goal: Move from procedural calculations to the modular Engine.*
- **Engine Refactor**: Replace the linear flow in `simulation.py` with the **Simulation Engine "Clock"** and **State Object**.
- **Component Migration**: Wrap existing calculations (`PV_Model`, `Battery_Model`) into the new modular **Component Models**.
- **Result Delivery**: Update the frontend to fetch aggregated summaries from BigQuery/Firestore instead of CSV blobs.

### Phase 2: Introducing Agents & Scenarios
*Goal: Bring the simulation to life with dynamic behavior and structured analysis.*
- **Behavioral Agents**: Develop the initial `Operator_Agent` and `Customer_Agent` with heuristic-based logic.
- **Comprehension Layer**: Implement the perception logic (modeling information latency/bias).
- **Event Scheduler**: Build the timeline for "stress test" scenarios.
- **Evaluative Agents**: Create the first Evaluative Agents to produce high-level KPIs.

### Phase 3: Advanced Features & Optimization
*Goal: Enhance the simulation's realism and performance.*
- **Learning Mechanisms**: Introduce advanced learning (e.g., model-based utility functions or simple RL).
- **Performance Tuning**: Profile the code and implement **Numba** and **multiprocessing** for heavy state-dependent loops.
- **UI/UX Refinement**: Refine the frontend for advanced scenario comparison and analysis.

---

## 8. Audit & Migration Tracking
*This section tracks the gaps between the current "Legacy" implementation and the Target Blueprint.*

### Key Discrepancies
- [ ] **Architecture**: Legacy is Procedural; Target is Agent-based/Modular.
- [ ] **Execution**: Legacy is Synchronous; Target is Asynchronous (Pub/Sub -> Cloud Run).
- [ ] **Data Storage**: Legacy uses CSV blobs; Target uses Hybrid (Firestore + BigQuery).
- [ ] **Optimization**: Legacy uses basic NumPy; Target requires Numba JIT and Multiprocessing.

### Progress Tracker
- [ ] Phase 0: Structural Alignment (In Progress)
- [ ] Phase 1: Core Engine & MVP
- [ ] Phase 2: Introducing Agents & Scenarios
- [ ] Phase 3: Advanced Features & Optimization
