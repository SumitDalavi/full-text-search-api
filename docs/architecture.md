# full-text-search-api Architecture

## System Diagram
The following Mermaid.js sequence diagram maps the core workflow and interactions:

```mermaid
sequenceDiagram
    client->>API: GET /search?q=foo
API->>Postgres: @@ to_tsquery('foo')
Postgres-->>API: Results
API-->>client: JSON
```

## Component Breakdown
- **Core Technology**: Node.js, Postgres
- **Design Paradigm**: Emphasizes high availability, fault tolerance, and security.

## Security & Scaling Considerations
- Strict boundary validations.
- Horizontal scalability achieved via stateless workers.
- Encrypted data at rest and in transit.
