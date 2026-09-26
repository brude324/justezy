import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Table from "@/components/Table";

describe("Component Smoke Test", () => {
  it("renders Table component with columns and rows cleanly", () => {
    const columns = [
      { header: "Name", accessor: "name" },
      { header: "Grade", accessor: "grade" },
    ];
    const data = [
      { id: "1", name: "Alice Sharma", grade: "10-A" },
      { id: "2", name: "Rohan Verma", grade: "10-B" },
    ];

    render(
      <Table
        columns={columns}
        data={data}
        renderRow={(item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.grade}</td>
          </tr>
        )}
      />
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Grade")).toBeInTheDocument();
    expect(screen.getByText("Alice Sharma")).toBeInTheDocument();
    expect(screen.getByText("Rohan Verma")).toBeInTheDocument();
  });
});
