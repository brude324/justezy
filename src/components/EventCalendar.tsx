"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];

const EventCalendar = () => {
  const [value, setValue] = useState<Value>(new Date());
  const router = useRouter();

  const handleDateChange = (val: Value) => {
    setValue(val);
    if (val instanceof Date) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, "0");
      const day = String(val.getDate()).padStart(2, "0");
      router.push(`?date=${year}-${month}-${day}`);
    }
  };

  return <Calendar onChange={handleDateChange} value={value} />;
};

export default EventCalendar;
