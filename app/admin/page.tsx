"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Field = {
  id: string;
  label: string;
  type: "text" | "number" | "email";
  required: boolean;
};

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([
    { id: crypto.randomUUID(), label: "", type: "text", required: false },
  ]);

  const addField = () => {
    setFields([...fields, { id: crypto.randomUUID(), label: "", type: "text", required: false }]);
  };

  const updateField = (index: number, key: keyof Field, value: string | boolean) => {
    const newFields = [...fields];

    if (key === "required" && typeof value === "boolean") {
      newFields[index].required = value;
    } else if (key === "label") {
      newFields[index].label = value as string;
    } else if (key === "type") {
      newFields[index].type = value as Field["type"];
    }

    setFields(newFields);
  };

  const handlePublish = () => {
    const form = { id: crypto.randomUUID(), title, description, fields };
    // temp
    const existingForm = JSON.parse(localStorage.getItem("forms") || "[]");
    localStorage.setItem("forms", JSON.stringify([...existingForm, form]));

    window.location.href = `/form/${form.id}`;
  };

  return (
    <div className="py-10 w-full lg:w-[75%] mx-auto">
      <h1 className="sr-only">Admin Page</h1>
      <div className="w-full mx-auto space-y-6">
        <Card className="bg-[#18132f] border border-[#2c254b] text-brownish shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Create New Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-brownish text-lg">Form Title</Label>
              <Input
                className="text-cream"
                placeholder="Enter form Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-brownish text-lg">Description</Label>
              <Textarea
                className="text-cream"
                placeholder="What is this form about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {fields.map((field, index) => (
          <Card key={field.id} className="text-cream relative">
            <CardContent className="space-y-4">
              <button
                onClick={() => {
                  setFields((prev) => prev.filter((_, i) => i !== index));
                }}
                className="absolute top-3 right-4 text-cream transition cursor-pointer"
                aria-label="Delete field">
                <Trash2 className="size-4.5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <Label className="text-brownish text-lg">Field Label</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`required-${field.id}`} className="text-sm text-brownish">
                      Required
                    </Label>
                    <Checkbox
                      id={`required-${field.id}`}
                      checked={field.required || false}
                      onCheckedChange={(checked) =>
                        updateField(index, "required", checked === true)
                      }
                      className="accent-brownish"
                    />
                  </div>
                </div>
                <Input
                  className="text-cream"
                  placeholder="Enter field label"
                  value={field.label}
                  onChange={(e) => updateField(index, "label", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-brownish text-lg">Input Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) => updateField(index, "type", value as Field["type"])}>
                  <SelectTrigger className="text-cream bg-darkblue">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-darkblue border border-[#2c254b] text-cream">
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-between gap-4">
          <Button
            onClick={addField}
            className="bg-cream text-darkblue border border-cream hover:bg-cream/70">
            <Plus className="w-4 h-4 mr-2" /> Add Field
          </Button>

          <Button
            onClick={handlePublish}
            className="bg-brownish text-darkblue hover:bg-brownish/70">
            <UploadCloud className="w-4 h-4 mr-2" /> Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
