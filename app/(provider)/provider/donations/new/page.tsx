import { createAdminClient } from '@/lib/supabase/admin'
import { createDonation } from './actions'
import { Info, ShieldAlert } from 'lucide-react'
import { LocationPicker } from './LocationPicker'

export default async function NewDonationPage() {
  const adminClient = createAdminClient()
  const { data: categories } = await adminClient.from('donation_categories').select('id, name').eq('is_active', true)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Donate Surplus Food</h1>
        <p className="mt-1 text-sm text-gray-500">Provide details about the food so we can match it with the right NGO.</p>
      </div>

      <form action={createDonation} className="bg-card shadow-sm border border-border rounded-lg p-6 space-y-8">
        {/* Basic Details */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-foreground border-b border-border pb-2">Food Details</h3>
          <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="foodName" className="block text-sm font-medium text-foreground">Food Name/Title</label>
              <input type="text" name="foodName" id="foodName" required className="mt-1 block w-full rounded-md border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-background" placeholder="e.g. Assorted Sandwiches and Salads" />
            </div>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-foreground">Category</label>
              <select id="categoryId" name="categoryId" required className="mt-1 block w-full rounded-md border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-background">
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="foodType" className="block text-sm font-medium text-foreground">Food Type</label>
              <select id="foodType" name="foodType" required className="mt-1 block w-full rounded-md border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-background">
                <option value="VEG">Vegetarian</option>
                <option value="NON_VEG">Non-Vegetarian</option>
                <option value="VEGAN">Vegan</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-foreground">Quantity</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input type="number" name="quantity" id="quantity" step="0.1" min="0" required className="block w-full rounded-none rounded-l-md border-input focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-background" placeholder="e.g. 5" />
                <input type="text" name="quantityUnit" required placeholder="Unit (e.g. kg, boxes)" className="inline-flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-muted-foreground sm:text-sm w-32" />
              </div>
            </div>

            <div>
              <label htmlFor="mealsEstimate" className="block text-sm font-medium text-foreground">Meals Estimate</label>
              <input type="number" name="mealsEstimate" id="mealsEstimate" min="0" required className="mt-1 block w-full rounded-md border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-background" placeholder="e.g. 20" />
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-foreground">Description / Notes</label>
              <textarea id="description" name="description" rows={3} className="mt-1 block w-full rounded-md border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-background"></textarea>
            </div>
          </div>
        </div>

        {/* Timings */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-foreground border-b border-border pb-2">Timings & Location</h3>
          <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="preparedAt" className="block text-sm font-medium text-foreground">Prepared At</label>
              <input type="datetime-local" name="preparedAt" id="preparedAt" required className="mt-1 block w-full rounded-md border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-background" />
            </div>
            <div>
              <label htmlFor="consumeBefore" className="block text-sm font-medium text-foreground">Consume Before (Expiry)</label>
              <input type="datetime-local" name="consumeBefore" id="consumeBefore" required className="mt-1 block w-full rounded-md border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-background" />
            </div>
            <div className="sm:col-span-2">
              <LocationPicker />
              <p className="mt-1 text-xs text-muted-foreground"><Info className="inline h-3 w-3 mr-1"/>This will be shared with the matched NGO for navigation.</p>
            </div>
          </div>
        </div>

        {/* Safety & Allergens */}
        <div className="urgency-medium p-6 rounded-lg">
          <h3 className="text-lg font-medium leading-6 flex items-center mb-4">
            <ShieldAlert className="h-5 w-5 mr-2" />
            Mandatory Safety Checklist
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input id="properStorage" name="properStorage" type="checkbox" required className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="properStorage" className="font-medium text-foreground">Proper Storage Maintained</label>
                <p className="text-muted-foreground">Food has been kept in hygienic conditions since preparation.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input id="safePackaging" name="safePackaging" type="checkbox" required className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="safePackaging" className="font-medium text-foreground">Safe Packaging Used</label>
                <p className="text-muted-foreground">Food is packed in food-grade, leak-proof containers.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input id="tempControlled" name="tempControlled" type="checkbox" required className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="tempControlled" className="font-medium text-foreground">Temperature Requirements Met</label>
                <p className="text-muted-foreground">Perishable food has been kept at safe temperatures.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-accent/20">
            <label className="block text-sm font-medium mb-2">Declare Allergens (if any)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Milk', 'Peanuts', 'Gluten', 'Soy', 'Eggs', 'Nuts', 'Shellfish'].map(allergen => (
                <div key={allergen} className="flex items-center">
                  <input id={`allergen-${allergen}`} name="allergens" value={allergen} type="checkbox" className="h-4 w-4 rounded border-input text-accent focus:ring-accent" />
                  <label htmlFor={`allergen-${allergen}`} className="ml-2 text-sm text-foreground">{allergen}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Recurring Option */}
          <div className="mt-6 pt-6 border-t border-accent/20">
            <h3 className="block text-sm font-medium mb-4 text-gray-900">Recurring Schedule</h3>
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input id="isRecurring" name="isRecurring" type="checkbox" className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="isRecurring" className="font-medium text-foreground">Set as Recurring Donation</label>
                <p className="text-muted-foreground">This exact donation will be automatically generated on a schedule.</p>
              </div>
            </div>
            
            <div className="mt-4 ml-7">
              <label htmlFor="recurringSchedule" className="block text-sm font-medium text-gray-700">Frequency</label>
              <select
                id="recurringSchedule"
                name="recurringSchedule"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 border"
              >
                <option value="">Select a schedule (Optional if not recurring)</option>
                <option value="0 10 * * *">Daily at 10:00 AM</option>
                <option value="0 18 * * *">Daily at 6:00 PM</option>
                <option value="0 10 * * 1">Weekly on Monday (10 AM)</option>
                <option value="0 10 * * 5">Weekly on Friday (10 AM)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-border">
          <div className="flex justify-end">
            <button type="button" className="rounded-md border border-input bg-card py-2 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              Cancel
            </button>
            <button type="submit" className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              Publish Donation & Match
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
