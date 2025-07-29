
"use client";

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, User, Truck, IndianRupee, FileText, Loader2, Gauge, Edit, Clock, Coins, Wallet, Camera, Upload, CheckCircle, AlertCircle, Video, CircleUserRound, CameraOff, X } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label }
from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { salesDataSchema, type SalesDataFormValues, type UserRole } from '@/lib/types';
import { getLastMeterReadingForVehicleAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface AquaTrackFormProps {
  onSubmit: (values: SalesDataFormValues) => void;
  isProcessing: boolean;
  currentUserRole: UserRole;
  ridersFromDB: string[]; 
  persistentRatePerLiter: number;
  formRefreshTrigger: number;
}

const vehicleOptions = ['Alpha', 'Beta', 'Croma', 'Delta', 'Eta'];
const hoursWorkedOptions = Array.from({ length: 9 }, (_, i) => String(i + 1));

const coinDenominations = [
  { value: 1, label: "₹1 Coin" },
  { value: 2, label: "₹2 Coin" },
  { value: 5, label: "₹5 Coin" },
  { value: 10, label: "₹10 Coin" },
  { value: 20, label: "₹20 Coin" },
];
const noteDenominations = [
  { value: 10, label: "₹10 Note" },
  { value: 20, label: "₹20 Note" },
  { value: 50, label: "₹50 Note" },
  { value: 100, label: "₹100 Note" },
  { value: 500, label: "₹500 Note" },
];

type DenominationQuantities = { [key: string]: string };

const ImageUploader: React.FC<{
  fieldName: 'meterReadingImageDriveLink' | 'riderCollectionTokenImageDriveLink';
  label: string;
  form: any;
  aspectRatio: string;
}> = ({ fieldName, label, form, aspectRatio }) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [showCamera, setShowCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    setShowCamera(true);
    setCapturedImage(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCameraPermission(true);
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        toast({ title: "Camera Error", description: "Could not access camera. Please check permissions.", variant: "destructive" });
        setHasCameraPermission(false);
        setShowCamera(false);
      }
    } else {
      toast({ title: "Camera Error", description: "Camera not supported on this device/browser.", variant: "destructive" });
      setHasCameraPermission(false);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const uploadFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: "Error", description: "File size must be less than 5MB.", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', `${fieldName}-${Date.now()}`);

    try {
      const response = await fetch('/api/upload-image', { method: 'POST', body: formData });
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 90) clearInterval(interval);
      }, 200);

      const result = await response.json();
      clearInterval(interval);
      setUploadProgress(100);

      if (response.ok && result.success) {
        form.setValue(fieldName, result.url, { shouldValidate: true });
        toast({ title: "Success", description: `${label} uploaded successfully.` });
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
      setPreview(null);
    } finally {
      setIsUploading(false);
      setCapturedImage(null);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    await uploadFile(file);
  };
  
  const handleUseCapturedImage = async () => {
    if (capturedImage) {
      setPreview(capturedImage);
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `${fieldName}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadFile(file);
    }
  };

  const urlValue = form.watch(fieldName);

  if (showCamera) {
    return (
      <FormItem>
         <FormLabel className="flex items-center">
            <Camera className="mr-2 h-4 w-4 text-primary" />{label}
        </FormLabel>
        <div className="p-4 border rounded-md">
            <video ref={videoRef} className="w-full rounded-md" autoPlay playsInline />
            <div className="flex gap-2 mt-2">
                <Button type="button" onClick={handleCapture} className="flex-1">Take Picture</Button>
                <Button type="button" variant="outline" onClick={stopCamera}>Cancel</Button>
            </div>
        </div>
      </FormItem>
    );
  }

  if(capturedImage) {
    return (
       <FormItem>
         <FormLabel className="flex items-center">
            <Camera className="mr-2 h-4 w-4 text-primary" />{label}
        </FormLabel>
        <div className="p-2 border rounded-md w-fit">
            <Image src={capturedImage} alt="Captured preview" width={192} height={144} className="rounded-md" />
            <div className="flex gap-2 mt-2">
                <Button type="button" onClick={handleUseCapturedImage} disabled={isUploading} className="flex-1">
                    {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : <>Use Picture</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setCapturedImage(null); startCamera(); }}>Retake</Button>
            </div>
        </div>
      </FormItem>
    );
  }

  return (
    <FormItem>
      <FormLabel className="flex items-center">
        <CircleUserRound className="mr-2 h-4 w-4 text-primary" />{label} (Compulsory, {aspectRatio} ratio)
      </FormLabel>
      <FormControl>
        <div>
          <Input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload Image"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              disabled={isUploading}
            >
              <Video className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
          </div>
          
           {isUploading && <Progress value={uploadProgress} className="w-full mt-2" />}

           {(preview || urlValue) && (
            <div className="mt-4 p-2 border rounded-md relative w-48 h-auto">
               <Image 
                src={preview || urlValue} 
                alt={`${label} preview`} 
                width={192} 
                height={aspectRatio === '1:1' ? 192 : 144}
                className="rounded-md object-cover"
               />
               {urlValue && !isUploading && (
                   <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                   </div>
               )}
            </div>
           )}

            <FormField
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                     <Input {...field} type="hidden" />
                )}
            />

        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};


export function AquaTrackForm({ onSubmit, isProcessing, currentUserRole, ridersFromDB, persistentRatePerLiter, formRefreshTrigger }: AquaTrackFormProps) {
  const form = useForm<SalesDataFormValues>({
    resolver: zodResolver(salesDataSchema),
    defaultValues: {
      date: new Date(),
      riderName: '',
      vehicleName: '',
      previousMeterReading: 0,
      currentMeterReading: 0,
      overrideLitersSold: undefined,
      ratePerLiter: persistentRatePerLiter,
      cashReceived: 0,
      onlineReceived: 0,
      dueCollected: 0,
      newDueAmount: 0,
      tokenMoney: 0,
      staffExpense: 0,
      extraAmount: 0,
      hoursWorked: 9,
      comment: '',
      meterReadingImageDriveLink: '',
      riderCollectionTokenImageDriveLink: '',
    },
  });

  const selectedVehicleName = useWatch({ control: form.control, name: 'vehicleName' });
  const selectedDate = useWatch({ control: form.control, name: 'date' });
  const { setValue, getValues, watch } = form;

  const [isClient, setIsClient] = useState(false);
  const [isLoadingPrevReading, setIsLoadingPrevReading] = useState(false);

  const [denominationQuantities, setDenominationQuantities] = useState<DenominationQuantities>({});
  const [calculatedCashTotal, setCalculatedCashTotal] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      if (currentUserRole === 'TeamLeader') {
        setValue('date', new Date(), { shouldValidate: true, shouldDirty: true });
      }
      setValue('ratePerLiter', persistentRatePerLiter, { shouldValidate: true, shouldDirty: true });

      if (currentUserRole !== 'Admin' && getValues('overrideLitersSold') !== undefined) {
        setValue('overrideLitersSold', undefined, { shouldValidate: true });
      }
    }
  }, [currentUserRole, setValue, getValues, persistentRatePerLiter, isClient]);


  useEffect(() => {
    if (isClient && selectedVehicleName) {
      const fetchPrevReading = async () => {
        setIsLoadingPrevReading(true);
        const dateToQueryISO = selectedDate instanceof Date && !isNaN(selectedDate.getTime()) 
          ? selectedDate.toISOString() 
          : undefined;
          
        const result = await getLastMeterReadingForVehicleAction(selectedVehicleName, dateToQueryISO);
        if (result.success) {
          setValue('previousMeterReading', result.reading, { shouldValidate: true, shouldDirty: true });
          if(result.message && (result.reading === 0)) { 
             console.info(`[AquaTrackForm] Fetch previous reading: ${result.message}`);
          }
        } else {
          setValue('previousMeterReading', 0, { shouldValidate: true, shouldDirty: true });
          console.error(`[AquaTrackForm] Error fetching previous reading: ${result.message}`);
        }
        setIsLoadingPrevReading(false);
      };
      fetchPrevReading();
    } else if (isClient && !selectedVehicleName) {
      setValue('previousMeterReading', 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedVehicleName, selectedDate, setValue, isClient, formRefreshTrigger]);


  useEffect(() => {
    let total = 0;
    for (const den of coinDenominations) {
      const qty = parseInt(denominationQuantities[`coin_${den.value}`] || "0");
      total += qty * den.value;
    }
    for (const den of noteDenominations) {
      const qty = parseInt(denominationQuantities[`note_${den.value}`] || "0");
      total += qty * den.value;
    }
    setCalculatedCashTotal(total);
  }, [denominationQuantities]);

  const handleDenominationQuantityChange = (type: 'coin' | 'note', value: number, quantity: string) => {
    setDenominationQuantities(prev => ({
      ...prev,
      [`${type}_${value}`]: quantity.replace(/[^0-9]/g, ''),
    }));
  };

  const applyCalculatedTotalToCashReceived = () => {
    setValue('cashReceived', calculatedCashTotal, { shouldValidate: true, shouldDirty: true });
  };


  const [
    watchedPreviousMeterReading,
    watchedCurrentMeterReading,
    watchedOverrideLitersSold,
    watchedRatePerLiter,
    watchedCashReceived,
    watchedOnlineReceived,
    watchedDueCollected,
    watchedNewDueAmount,
    watchedTokenMoney,
    watchedStaffExpense,
    watchedExtraAmount,
  ] = watch([
    'previousMeterReading',
    'currentMeterReading',
    'overrideLitersSold',
    'ratePerLiter',
    'cashReceived',
    'onlineReceived',
    'dueCollected',
    'newDueAmount',
    'tokenMoney',
    'staffExpense',
    'extraAmount',
  ]);


  const liveCalculatedLitersSold = React.useMemo(() => {
    const prev = Number(watchedPreviousMeterReading);
    const curr = Number(watchedCurrentMeterReading);
    const override = watchedOverrideLitersSold !== undefined ? Number(watchedOverrideLitersSold) : undefined;

    if (currentUserRole === 'Admin' && typeof override === 'number' && override >= 0) {
      return override;
    }
    if (!isNaN(prev) && !isNaN(curr) && curr >= prev) {
      return curr - prev;
    }
    return 0;
  }, [watchedPreviousMeterReading, watchedCurrentMeterReading, watchedOverrideLitersSold, currentUserRole]);

  const liveTotalSale = React.useMemo(() => {
    return liveCalculatedLitersSold * (Number(watchedRatePerLiter) || 0);
  }, [liveCalculatedLitersSold, watchedRatePerLiter]);

  const liveDiscrepancy = React.useMemo(() => {
    const totalSaleVal = liveTotalSale;
    const dueCollectedVal = Number(watchedDueCollected) || 0;
    const cashReceivedVal = Number(watchedCashReceived) || 0;
    const onlineReceivedVal = Number(watchedOnlineReceived) || 0;
    const newDueAmountVal = Number(watchedNewDueAmount) || 0;
    const tokenMoneyVal = Number(watchedTokenMoney) || 0;
    const extraAmountVal = Number(watchedExtraAmount) || 0;
    const staffExpenseVal = Number(watchedStaffExpense) || 0;

    return (totalSaleVal + dueCollectedVal) - (cashReceivedVal + onlineReceivedVal + newDueAmountVal + tokenMoneyVal + extraAmountVal + staffExpenseVal);
  }, [liveTotalSale, watchedCashReceived, watchedOnlineReceived, watchedDueCollected, watchedNewDueAmount, watchedTokenMoney, watchedStaffExpense, watchedExtraAmount]);

  const inputFieldsDefinition = [
    { name: 'riderName', label: 'Rider Name', icon: User, placeholder: 'Select rider name', componentType: 'select', options: ridersFromDB },
    { name: 'vehicleName', label: 'Vehicle Name', icon: Truck, componentType: 'select', options: vehicleOptions, placeholder: 'Select vehicle name' },
    { name: 'hoursWorked', label: 'Hours Worked', icon: Clock, componentType: 'select', options: hoursWorkedOptions, placeholder: 'Select hours' },
    { name: 'previousMeterReading', label: 'Previous Meter Reading', icon: Gauge, type: 'number', placeholder: 'e.g., 12300', componentType: 'input', description: "Auto-filled. Admin can edit." },
    { name: 'currentMeterReading', label: 'Current Meter Reading', icon: Gauge, type: 'number', placeholder: 'e.g., 12450', componentType: 'input' },
    { name: 'ratePerLiter', label: 'Rate Per Liter', icon: IndianRupee, type: 'number', placeholder: 'e.g., 2.5', componentType: 'input', description: `Global rate: ₹${persistentRatePerLiter.toFixed(2)}. Editable by Admin/Team Leader.` },
    { name: 'cashReceived', label: 'Cash Received', icon: IndianRupee, type: 'number', placeholder: 'e.g., 3000', componentType: 'input' },
    { name: 'onlineReceived', label: 'Online Received', icon: IndianRupee, type: 'number', placeholder: 'e.g., 500', componentType: 'input' },
    { name: 'dueCollected', label: 'Due Collected (Past Dues)', icon: IndianRupee, type: 'number', placeholder: 'e.g., 100', componentType: 'input' },
    { name: 'newDueAmount', label: 'New Due Amount (Today\'s Sale)', icon: IndianRupee, type: 'number', placeholder: 'e.g., 30', componentType: 'input' },
    { name: 'tokenMoney', label: 'Token Money', icon: IndianRupee, type: 'number', placeholder: 'e.g., 50', componentType: 'input' },
    { name: 'staffExpense', label: 'Staff Expense', icon: IndianRupee, type: 'number', placeholder: 'e.g., 20', componentType: 'input' },
    { name: 'extraAmount', label: 'Extra Amount', icon: IndianRupee, type: 'number', placeholder: 'e.g., 10', componentType: 'input' },
  ] as const;


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Sale</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                         (currentUserRole === 'TeamLeader' && isClient) && "cursor-not-allowed opacity-70"
                      )}
                      disabled={currentUserRole === 'TeamLeader' && isClient}
                    >
                      {isClient && field.value ? (
                        format(field.value instanceof Date ? field.value : new Date(field.value || Date.now()), "PPP")
                      ) : (
                        <span>{isClient ? "Initializing date..." : "Pick a date"}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {currentUserRole === 'Admin' && (
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value instanceof Date ? field.value : new Date(field.value || Date.now())}
                      onSelect={(date) => {
                        if (date && isClient) field.onChange(date);
                      }}
                      disabled={(date) =>
                        date > new Date() ||
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                )}
              </Popover>
              {currentUserRole === 'TeamLeader' && isClient && <FormDescription className="mt-1">Date is automatically set to today for Team Leaders.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inputFieldsDefinition.map((inputField) => {
            const isPrevMeterReadingField = inputField.name === 'previousMeterReading';
            const isRatePerLiterField = inputField.name === 'ratePerLiter';

            let fieldIsDisabled = false;
            if (isPrevMeterReadingField && (currentUserRole === 'TeamLeader' || isLoadingPrevReading)) {
              fieldIsDisabled = true;
            }
            if (isRatePerLiterField && !(currentUserRole === 'Admin' || currentUserRole === 'TeamLeader')) {
              fieldIsDisabled = true;
            }


            let currentOptions: string[] = [];
             if ('options' in inputField && inputField.options) {
              currentOptions = inputField.options;
            }


            const renderFormField = (
                <FormField
                    key={inputField.name}
                    control={form.control}
                    name={inputField.name as keyof SalesDataFormValues}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center">
                        {inputField.icon && <inputField.icon className="mr-2 h-4 w-4 text-primary" />}
                        {inputField.label}
                        {isPrevMeterReadingField && isLoadingPrevReading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        </FormLabel>
                        <FormControl>
                        {inputField.componentType === 'select' ? (
                            <Select
                            onValueChange={(value) => {
                                const valToSet = inputField.name === 'hoursWorked' ? parseInt(value, 10) : value;
                                field.onChange(valToSet);
                            }}
                            value={String(field.value === undefined || field.value === null ? (inputField.name === 'hoursWorked' ? '9' : '') : field.value)}
                            disabled={fieldIsDisabled || (inputField.name === 'riderName' && ridersFromDB.length === 0)}
                            >
                            <SelectTrigger className={cn("text-base", (fieldIsDisabled || (inputField.name === 'riderName' && ridersFromDB.length === 0)) && "cursor-not-allowed opacity-70")}>
                                <SelectValue placeholder={inputField.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {currentOptions && currentOptions.length > 0 ? (
                                currentOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                    {option} {inputField.name === 'hoursWorked' ? 'hr' : ''}
                                    </SelectItem>
                                ))
                                ) : (
                                <SelectItem value="placeholder-no-options" disabled>
                                    {inputField.name === 'riderName' ? 'No riders (manage in Admin Panel)' : 'No options'}
                                </SelectItem>
                                )}
                            </SelectContent>
                            </Select>
                        ) : (
                            <Input
                            type={inputField.type || 'text'}
                            placeholder={inputField.placeholder}
                            {...field}
                            disabled={fieldIsDisabled}
                            value={ typeof field.value === 'number' && field.value === 0 && inputField.name !== 'previousMeterReading' && inputField.name !== 'currentMeterReading' && inputField.name !== 'overrideLitersSold' && inputField.name !== 'newDueAmount' ? "" : (field.value ?? "") }
                            onChange={event => {
                                if (inputField.type === 'number') {
                                const numValue = parseFloat(event.target.value);
                                field.onChange(isNaN(numValue) ? (inputField.name === 'overrideLitersSold' ? undefined : '') : numValue);
                                } else {
                                field.onChange(event.target.value);
                                }
                            }}
                            className={cn("text-base", fieldIsDisabled && "cursor-not-allowed opacity-70")}
                            />
                        )}
                        </FormControl>
                        {inputField.description && <FormDescription>{inputField.description}</FormDescription>}
                        {isPrevMeterReadingField && currentUserRole === 'TeamLeader' && isClient && selectedVehicleName && !isLoadingPrevReading && form.getValues('previousMeterReading') === 0 && <FormDescription>No prior reading for this vehicle before selected date.</FormDescription>}
                        <FormMessage />
                    </FormItem>
                    )}
                />
            );

            return (
                <React.Fragment key={`fragment_${inputField.name}`}>
                    {renderFormField}
                    {inputField.name === 'currentMeterReading' && (
                        <div className="md:col-span-2">
                           <ImageUploader
                                fieldName="meterReadingImageDriveLink"
                                label="Meter Image"
                                form={form}
                                aspectRatio="1:1"
                            />
                        </div>
                    )}
                    {inputField.name === 'ratePerLiter' && (
                      <div className="md:col-span-2 my-4">
                        <Accordion type="single" collapsible className="w-full border rounded-md shadow-sm">
                          <AccordionItem value="cash-calculator">
                            <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline bg-muted/30 hover:bg-muted/50 rounded-t-md">
                              <div className="flex items-center">
                                <Coins className="mr-2 h-5 w-5 text-primary" /> Cash Denomination Calculator
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 space-y-6 border-t">
                              <div>
                                <h4 className="text-md font-medium mb-3 text-muted-foreground">Coins</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
                                  {coinDenominations.map(den => (
                                    <div key={`coin_${den.value}`}>
                                      <Label htmlFor={`coin_qty_${den.value}`} className="text-sm font-normal">{den.label}</Label>
                                      <Input
                                        id={`coin_qty_${den.value}`}
                                        type="number"
                                        min="0"
                                        value={denominationQuantities[`coin_${den.value}`] || ""}
                                        onChange={(e) => handleDenominationQuantityChange('coin', den.value, e.target.value)}
                                        placeholder="Qty"
                                        className="text-sm mt-1 h-9"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-md font-medium mb-3 text-muted-foreground">Notes</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
                                  {noteDenominations.map(den => (
                                    <div key={`note_${den.value}`}>
                                      <Label htmlFor={`note_qty_${den.value}`} className="text-sm font-normal">{den.label}</Label>
                                      <Input
                                        id={`note_qty_${den.value}`}
                                        type="number"
                                        min="0"
                                        value={denominationQuantities[`note_${den.value}`] || ""}
                                        onChange={(e) => handleDenominationQuantityChange('note', den.value, e.target.value)}
                                        placeholder="Qty"
                                        className="text-sm mt-1 h-9"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-lg font-semibold">
                                  Calculated Total: <span className="text-primary">₹{calculatedCashTotal.toFixed(2)}</span>
                                </div>
                                <Button type="button" onClick={applyCalculatedTotalToCashReceived} size="sm">
                                  <Wallet className="mr-2 h-4 w-4" /> Apply to Cash Received
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}
                </React.Fragment>
            );


          })}
        </div>

        {currentUserRole === 'Admin' && (
          <FormField
            control={form.control}
            name="overrideLitersSold"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Edit className="mr-2 h-4 w-4 text-primary" />
                  Override Liters Sold (Admin Only, Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 150 (Overrides calculation if set)"
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                     onChange={event => {
                        const numValue = parseFloat(event.target.value);
                        field.onChange(isNaN(numValue) || event.target.value === '' ? undefined : numValue);
                      }}
                    className="text-base"
                  />
                </FormControl>
                <FormDescription>If a value is entered here, it will be used as Liters Sold, otherwise it's calculated from meter readings.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-md">
            <FormLabel className="flex items-center text-primary">
              <Gauge className="mr-2 h-4 w-4" /> Calculated Liters Sold
            </FormLabel>
            <p className="text-2xl font-bold mt-1">{liveCalculatedLitersSold.toFixed(2)} L</p>
            <FormDescription>
              {currentUserRole === 'Admin' && typeof watchedOverrideLitersSold === 'number' && watchedOverrideLitersSold >= 0
                ? "Using admin override value."
                : "Calculated from meter readings."}
            </FormDescription>
            {(form.formState.errors.currentMeterReading?.message || form.formState.errors.previousMeterReading?.message) &&
               <FormMessage className="mt-1">{form.formState.errors.currentMeterReading?.message || form.formState.errors.previousMeterReading?.message}</FormMessage>
            }
          </div>
          <div className="p-4 bg-muted/50 rounded-md">
            <FormLabel className="flex items-center text-primary">
              <IndianRupee className="mr-2 h-4 w-4" /> Live Discrepancy
            </FormLabel>
            <p className="text-2xl font-bold mt-1">₹{liveDiscrepancy.toFixed(2)}</p>
            <FormDescription>Based on current form values.</FormDescription>
          </div>
        </div>

        <ImageUploader
            fieldName="riderCollectionTokenImageDriveLink"
            label="Rider Collection Token Image"
            form={form}
            aspectRatio="4:3"
        />


        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <FileText className="mr-2 h-4 w-4 text-primary" />
                Comment (Optional)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any comments related to the sales data"
                  className="resize-none text-base"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full text-lg py-6" disabled={isProcessing || isLoadingPrevReading}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : isLoadingPrevReading ? (
             <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Fetching Previous Reading...
            </>
          ) : (
            'Calculate & Generate Report'
          )}
        </Button>
      </form>
    </Form>
  );
}
