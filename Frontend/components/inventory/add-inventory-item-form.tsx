'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Settings, Camera, Check, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AssetService } from '@/lib/services/asset-service'

interface AddInventoryItemFormProps {
  itemToEdit?: any;
  onSave: (item: any) => void;
  onCancel: () => void;
}

export function AddInventoryItemForm({ onSave, onCancel, itemToEdit }: AddInventoryItemFormProps) {
  const [name, setName] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [reorderPoint, setReorderPoint] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [category, setCategory] = useState('')
  const [supplier, setSupplier] = useState('')
  const [location, setLocation] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState('')

  // Cleanup preview URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || '');
      setPartNumber(itemToEdit.partNumber || '');
      setQuantity(itemToEdit.quantity?.toString() || '');
      setReorderPoint(itemToEdit.reorderPoint?.toString() || '');
      setUnitCost(itemToEdit.unitCost?.toString() || '');
      setCategory(itemToEdit.category || '');
      setSupplier(itemToEdit.supplier || '');
      setLocation(itemToEdit.location || '');
      setSelectedAssetId(itemToEdit.assetId || '');
      // Tags would be pre-filled here if they were part of the item object
    }
  }, [itemToEdit]);

  // Load assets for Select Asset dropdown
  useEffect(() => {
    const loadAssets = async () => {
      const a = await AssetService.getAssets()
      setAssets(a)
    }
    loadAssets()
  }, [])


  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const MAX_FILE_MB = 5;

  const validateAndSetFile = (file: File) => {
    const allowed = file.type.startsWith('image/');
    const tooLarge = file.size > MAX_FILE_MB * 1024 * 1024;

    if (!allowed) {
      setUploadError('Only image files are allowed.');
      return;
    }
    if (tooLarge) {
      setUploadError(`File size must be under ${MAX_FILE_MB}MB.`);
      return;
    }

    setUploadError(null);
    setImageFile(file);

    // Cleanup previous preview URL
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
    // Reset input value to allow re-selecting the same file
    if (event.currentTarget) event.currentTarget.value = '';
  };

  const handleSave = async () => {
    const itemData = {
      name,
      partNumber,
      quantity: parseInt(quantity, 10) || 0,
      reorderPoint: parseInt(reorderPoint, 10) || 0,
      unitCost: parseFloat(unitCost) || 0,
      category,
      supplier,
      // Keep image only for UI state; do not send preview URL to backend
      image: imageFile ? null : (itemToEdit?.image || null),
      location,
      assetId: selectedAssetId,
      assetName: assets.find(a => a.id === selectedAssetId)?.name || '',
    };

    try {
      const { InventoryService } = await import('@/lib/services/inventory-service')
      if (itemToEdit && itemToEdit.id) {
        // Do not include preview URL in update payload
        const { image, assetName, ...apiData } = itemData as any
        await InventoryService.updateInventoryItem(itemToEdit.id, apiData)
        if (imageFile) {
          try { await InventoryService.uploadInventoryImage(itemToEdit.id, imageFile) } catch {}
        }
        onSave({ id: itemToEdit.id, ...itemData })
      } else {
        // Create without image first
        const { image, assetName, ...apiData } = itemData as any
        const result = await InventoryService.createInventoryItem(apiData)
        const newId = result.id
        if (imageFile && newId) {
          try { await InventoryService.uploadInventoryImage(newId, imageFile) } catch {}
        }
        onSave({ id: newId, ...itemData })
      }
    } catch (e) {
      // fall back to local save if backend fails
      onSave({ id: itemToEdit ? itemToEdit.id : Date.now(), ...itemData })
    }
  };

  return (
    <div className="p-1 flex flex-col">
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2 rounded-lg">
              <Settings className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">{itemToEdit ? 'Edit Inventory Item' : 'Add a new inventory item'}</CardTitle>
              <CardDescription>{itemToEdit ? 'Update the details below.' : 'Fill in the details below to add a new item to the inventory.'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="inventory-item-name">Item name</Label>
              <Input id="inventory-item-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="part-number">Part #</Label>
              <Input id="part-number" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="asset-select">Select Asset</Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger id="asset-select">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            aria-label="Upload image"
          />

          {(imageFile || itemToEdit?.image) ? (
            <div className="p-4 border-2 border-slate-300 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const src = imageFile ? (previewUrl || '') : (typeof itemToEdit?.image === 'string' ? itemToEdit.image : '')
                    if (src) {
                      return <img src={src} alt={imageFile?.name || 'Existing image'} className="h-16 w-16 rounded object-cover border" />
                    }
                    return (
                      <div className="h-16 w-16 flex items-center justify-center bg-slate-50 rounded border">
                        <Camera className="h-8 w-8 text-slate-500" />
                      </div>
                    )
                  })()}
                  <div className="text-sm">
                    <p className="font-medium truncate max-w-[200px]" title={imageFile?.name || 'Existing file'}>
                      {imageFile?.name || 'Existing file'}
                    </p>
                    {imageFile && <p className="text-slate-500">{(imageFile.size / 1024).toFixed(1)} KB</p>}
                    {!imageFile && <p className="text-slate-500">Previously uploaded</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleImageUploadClick}>Change</Button>
                  {imageFile && (
                    <Button variant="ghost" size="icon" onClick={() => {
                      setImageFile(null)
                      setUploadError(null)
                      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
                    }} aria-label="Remove file">
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">PNG, JPG, JPEG, WEBP — up to 5MB.</p>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={handleImageUploadClick}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleImageUploadClick()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer?.files?.[0]; if (f) validateAndSetFile(f) }}
              className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}`}
            >
              <Camera className="h-10 w-10 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-600">Click to upload or drag and drop</span>
              <span className="text-xs text-slate-500 mt-1">PNG, JPG, JPEG, WEBP — up to 5MB</span>
            </div>
          )}
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="quantity">Stock Quantity</Label>
              <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reorder-point">Reorder Point</Label>
              <Input id="reorder-point" type="number" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit-cost">Unit Cost (₹)</Label>
              <Input id="unit-cost" type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="supplier-details">Supplier details</Label>
              <Textarea id="supplier-details" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Warehouse A-1" />
            </div>
          </div>

        </CardContent>
      </Card>
      <div className="flex justify-end gap-2 p-4 bg-slate-50 rounded-b-lg">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave}>
          <Check className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  )
}
