"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, Info, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import "@/styles/phone-input.css" // We'll move the CSS file to styles folder

export interface BaseUserData {
  name: string;
  username: string; // Email address
  password: string;
  phoneNumber: string;
  status: 'Active' | 'Inactive';
  notes?: string;
}

export type PasswordStrengthType = 'weak' | 'medium' | 'strong';

export interface UserFormBaseProps {
  formTitle: string;
  formDescription?: string;
  initialData?: Partial<BaseUserData>;
  userType: 'student' | 'teacher' | 'admin';
  isSubmitting?: boolean;
  submitError?: string;  onSubmit: (userData: BaseUserData) => Promise<void> | void;
  additionalFields?: React.ReactNode;
  submitButtonText?: string;
  generatePassword?: (name: string, email: string) => string;
  onStatusChange?: (status: 'Active' | 'Inactive') => void;
}

export default function UserFormBase({
  formTitle,
  formDescription,
  initialData = {},
  userType,  isSubmitting = false,
  submitError = "",
  onSubmit,
  additionalFields,
  submitButtonText = "Create Account",
  generatePassword,
  onStatusChange
}: UserFormBaseProps) {
  // Form state
  const [userData, setUserData] = useState<BaseUserData>({
    name: initialData.name || "",
    username: initialData.username || "",
    password: initialData.password || "",
    phoneNumber: initialData.phoneNumber || "",
    status: initialData.status || "Active",
    notes: initialData.notes || "",
  });
  
  // UI state
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthType>("weak");
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Check password strength whenever password changes
  useEffect(() => {
    const { password } = userData;
    
    if (password.length < 6) {
      setPasswordStrength("weak");
      return;
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    const strength = 
      (hasUpperCase ? 1 : 0) + 
      (hasLowerCase ? 1 : 0) + 
      (hasNumbers ? 1 : 0) + 
      (hasSpecialChars ? 1 : 0);
    
    if (strength >= 3 && password.length >= 8) {
      setPasswordStrength("strong");
    } else if (strength >= 2 && password.length >= 6) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("weak");
    }
  }, [userData.password]);
  
  // Validate form
  useEffect(() => {
    const { name, username, password } = userData;
    
    // Basic validation
    const isValid = 
      name.trim() !== "" && 
      username.trim() !== "" && 
      username.includes('@') && // Basic email validation
      password.length >= 6 &&
      passwordStrength !== "weak";
    
    setIsFormValid(isValid);
  }, [userData, passwordStrength]);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle phone input change
  const handlePhoneChange = (value: string): void => {
    setUserData(prev => ({ ...prev, phoneNumber: value }));
  };
  
  // Handle auto-password generation
  const handleGeneratePassword = (): void => {
    if (!generatePassword) return;
    
    if (userData.name && userData.username) {
      const generatedPassword = generatePassword(userData.name, userData.username);
      setUserData(prev => ({ ...prev, password: generatedPassword }));
    } else {
      toast.error(`Please enter ${userType}'s name and email first`);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error("Please complete all required fields");
      return;
    }
    
    onSubmit(userData);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{formTitle}</CardTitle>
        {formDescription && <CardDescription>{formDescription}</CardDescription>}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={userData.name} 
                  onChange={handleChange} 
                  placeholder={`Enter ${userType}'s full name`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Email Address <span className="text-red-500">*</span></Label>
                <Input 
                  id="username" 
                  name="username" 
                  type="email"
                  value={userData.username} 
                  onChange={handleChange} 
                  placeholder="email@example.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number {userType === 'student' ? '(Optional)' : <span className="text-red-500">*</span>}</Label>
                <PhoneInput
                  country={'in'}
                  value={userData.phoneNumber}
                  onChange={handlePhoneChange}
                  inputClass="phone-input-field"
                  containerClass="phone-input-container"
                  buttonClass="phone-input-dropdown"
                  dropdownClass="phone-input-dropdown-list"
                  searchClass="search-class"
                  enableSearch={true}
                  disableSearchIcon={false}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>                <Select
                  value={userData.status}
                  onValueChange={(value) => {
                    const status = value as 'Active' | 'Inactive';
                    setUserData(prev => ({ ...prev, status }));
                    if (onStatusChange) onStatusChange(status);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                  <div className="text-xs">
                    {passwordStrength === "weak" && <span className="text-red-500">Weak</span>}
                    {passwordStrength === "medium" && <span className="text-amber-500">Medium</span>}
                    {passwordStrength === "strong" && <span className="text-green-500">Strong</span>}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"}
                      value={userData.password} 
                      onChange={handleChange} 
                      placeholder="Enter a strong password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {generatePassword && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleGeneratePassword}
                      title="Generate secure password"
                    >
                      Generate
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password should be at least 8 characters with uppercase, lowercase, number and special character.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Input 
                id="notes" 
                name="notes" 
                value={userData.notes} 
                onChange={handleChange} 
                placeholder={`Any additional information about the ${userType}`}
              />
            </div>
          </div>
          
          {/* Additional fields slot */}
          {additionalFields}
          
          {/* Submit button */}
          <div className="pt-4">
            <Button 
              className="w-full" 
              type="submit"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating {userType.charAt(0).toUpperCase() + userType.slice(1)}...
                </>
              ) : (
                submitButtonText
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
