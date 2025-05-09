"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Field = {
  id: string;
  label: string;
  type: "text" | "number" | "email";
  required: boolean;
};

type Form = {
  id: string;
  title: string;
  description: string;
  fields: Field[];
};

export default function UserFormPage() {
  const { id } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});

  // temp
  useEffect(() => {
    const forms: Form[] = JSON.parse(localStorage.getItem("forms") || "[]");
    const foundForm = forms.find((f) => f.id === id);
    setForm(foundForm || null);
  }, [id]);

  const handleChange = (fieldId: string, value: string) => {
    setResponses({ ...responses, [fieldId]: value });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const missing = form?.fields.filter((f) => f.required && !responses[f.id]?.trim()) || [];

    if (missing.length > 0) {
      setInvalidFields(missing.map((f) => f.id));

      setTimeout(() => {
        const firstError = document.getElementById(`field-${missing[0].id}`);
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);

      return;
    }

    setInvalidFields([]);
  };

  if (!form) {
    return <div className="text-center text-red-500 mt-20">Form not found.</div>;
  }

  return (
    <form className="py-10 w-full lg:w-[75%] mx-auto">
      <Card className="bg-[#18132f] border border-[#2c254b] text-brownish shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">{form.title}</CardTitle>
          <p className="text-sm text-cream">{form.description}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-cream">
          {form.fields.map((field) => (
            <div key={field.id}>
              <Label className="text-brownish text-lg">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              <div id={`field-${field.id}`}>
                <Input
                  type={field.type}
                  className={`text-cream ${
                    invalidFields.includes(field.id) ? "border-red-500 ring-2 ring-red-500" : ""
                  }`}
                  value={responses[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              </div>
            </div>
          ))}

          <Button onClick={handleSubmit} className="bg-brownish text-darkblue hover:bg-brownish/70">
            Submit
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
