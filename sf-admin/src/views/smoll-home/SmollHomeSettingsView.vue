<template>
  <div class="pa-6 fade-in">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-8">
      <div>
        <h1 class="text-h4 font-weight-bold text-gray-900 mb-2">Settings</h1>
        <p class="text-subtitle-1 text-gray-500">
          Manage dynamic variables for the platform.
        </p>
      </div>
      <div v-if="loading" class="d-flex align-center text-primary">
        <v-progress-circular indeterminate size="24" class="mr-2"></v-progress-circular>
        <span class="text-body-2 font-weight-medium">Saving...</span>
      </div>
    </div>

    <!-- Content -->
    <v-card class="elevation-0 border rounded-xl overflow-hidden" :loading="loadingConfig">
      <v-card-text class="pa-6">
        <v-form @submit.prevent="saveConfig">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="config.travelFee"
                label="Travel Fee (AED)"
                type="number"
                variant="outlined"
                color="primary"
                prefix="AED"
                min="0"
                step="0.01"
                hint="This fee will automatically trigger in the mobile app when 'services' are in the cart."
                persistent-hint
                hide-details="auto"
                :disabled="loading"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="config.shippingFee"
                label="Shipping Fee (AED)"
                type="number"
                variant="outlined"
                color="primary"
                prefix="AED"
                min="0"
                step="0.01"
                hint="This fee will automatically trigger in the mobile app when 'products' are in the cart."
                persistent-hint
                hide-details="auto"
                :disabled="loading"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row class="mt-4">
            <v-col cols="12">
              <h3 class="text-h6 font-weight-medium mb-4">Calendar & Availability</h3>
            </v-col>

            <!-- Global defaults -->
            <v-col cols="12">
              <v-combobox
                v-model="config.homeServiceSlots"
                label="Default Available Time Slots"
                chips
                multiple
                clearable
                variant="outlined"
                color="primary"
                hint="These slots are used on all days unless a specific date is marked as off or has custom slots."
                persistent-hint
                hide-details="auto"
                :disabled="loading"
              ></v-combobox>
            </v-col>

            <!-- Lightweight month grid + day details -->
            <v-col cols="12" md="6">
              <v-card class="elevation-0 border rounded-lg">
                <v-card-title class="py-3 px-4 d-flex justify-space-between align-center">
                  <span class="text-subtitle-1 font-weight-medium">Calendar</span>
                  <div class="d-flex align-center" style="gap: 8px;">
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      @click="goToPrevMonth"
                      :disabled="loading"
                    >
                      <v-icon size="18">mdi-chevron-left</v-icon>
                    </v-btn>
                    <span class="text-body-2 text-gray-700">
                      {{ currentMonthLabel }}
                    </span>
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      @click="goToNextMonth"
                      :disabled="loading"
                    >
                      <v-icon size="18">mdi-chevron-right</v-icon>
                    </v-btn>
                  </div>
                </v-card-title>
                <v-card-text class="pt-0 px-4 pb-4">
                  <div class="calendar-grid">
                    <div class="calendar-grid-header">
                      <span v-for="w in weekDays" :key="w" class="calendar-grid-header-cell">
                        {{ w }}
                      </span>
                    </div>
                    <div class="calendar-grid-body">
                      <button
                        v-for="day in monthDays"
                        :key="day.key"
                        class="calendar-day-cell"
                        :class="[
                          day.isCurrentMonth ? '' : 'calendar-day-outside',
                          day.date === selectedDate ? 'calendar-day-selected' : '',
                          isDayOff(day.date) ? 'calendar-day-off' : '',
                          hasOverride(day.date) ? 'calendar-day-override' : '',
                        ]"
                        type="button"
                        @click="selectDate(day.date)"
                        :disabled="loading || !day.isCurrentMonth"
                      >
                        <span class="calendar-day-number">{{ day.day }}</span>
                        <span class="calendar-day-meta" v-if="isDayOff(day.date)">Off</span>
                        <span class="calendar-day-meta" v-else-if="hasOverride(day.date)">Custom</span>
                      </button>
                    </div>
                  </div>
                  <p class="text-caption text-gray-500 mt-2">
                    Click a date to mark it as using the default slots, custom slots, or a full day off.
                  </p>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card class="elevation-0 border rounded-lg">
                <v-card-title class="py-3 px-4 d-flex justify-space-between align-center">
                  <div>
                    <div class="text-subtitle-1 font-weight-medium">
                      Day details
                    </div>
                    <div class="text-caption text-gray-500">
                      {{ selectedDate || 'Select a date in the calendar' }}
                    </div>
                  </div>
                </v-card-title>
                <v-card-text class="pt-0 px-4 pb-4">
                  <div v-if="!selectedDate" class="text-body-2 text-gray-500 py-4">
                    Select a date on the calendar to edit its availability.
                  </div>
                  <div v-else>
                    <v-radio-group
                      v-model="selectedMode"
                      inline
                      :disabled="loading"
                    >
                      <v-radio label="Use default slots" value="global"></v-radio>
                      <v-radio label="Custom slots" value="custom"></v-radio>
                      <v-radio label="Day off" value="off"></v-radio>
                    </v-radio-group>

                    <div v-if="selectedMode === 'custom'" class="mt-4">
                      <v-combobox
                        v-model="localCustomSlots"
                        label="Custom time slots for this date"
                        chips
                        multiple
                        clearable
                        variant="outlined"
                        color="primary"
                        hint="Only these slots will be available for this date in the app."
                        persistent-hint
                        hide-details="auto"
                        :disabled="loading"
                      ></v-combobox>
                    </div>

                    <div class="mt-4 d-flex align-center" style="gap: 12px;">
                      <v-btn
                        color="primary"
                        variant="flat"
                        @click="applySelectedDateChanges"
                        :disabled="loading || !selectedDate"
                      >
                        Apply to this date
                      </v-btn>
                      <span class="text-caption text-gray-500">
                        Changes are saved when you click &quot;Save Settings&quot; below.
                      </span>
                    </div>

                    <div class="mt-4 text-caption text-gray-500">
                      Current state for this date:
                      <strong>
                        {{
                          selectedMode === 'off'
                            ? 'Day off (no slots)'
                            : selectedMode === 'custom'
                            ? (localCustomSlots.length || 0) + ' custom slot(s)'
                            : 'Using default slots (' + (config.homeServiceSlots.length || 0) + ' slot(s))'
                        }}
                      </strong>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <div class="mt-8 d-flex justify-start">
            <v-btn
              color="primary"
              size="large"
              type="submit"
              :loading="loading"
              rounded="lg"
              class="px-8 font-weight-bold shadow-sm"
              height="48"
              elevation="0"
            >
              Save Settings
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
// Assumes the admin has an axios instance or similar fetch mechanics.
// I will just use fetch as it's simple and works if we know the API URL.
import api from '@/util/api'

const config = ref<{
  travelFee: number
  shippingFee: number
  homeServiceSlots: string[]
  homeServiceDaysOff: string[]
  homeServiceOverrides: Record<string, string[]>
}>({
  travelFee: 79.0,
  shippingFee: 10.0,
  homeServiceSlots: [],
  homeServiceDaysOff: [],
  homeServiceOverrides: {},
})

const loadingConfig = ref(true)
const loading = ref(false)
const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

const today = new Date()
const currentMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref<string | null>(null)
const selectedMode = ref<'global' | 'custom' | 'off'>('global')
const localCustomSlots = ref<string[]>([])

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const currentMonthLabel = computed(() => {
  const d = currentMonth.value
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
})

const monthDays = computed(() => {
  const start = new Date(currentMonth.value.getTime())
  const year = start.getFullYear()
  const month = start.getMonth()

  // First day of month (0=Sun..6=Sat), convert to Monday‑first offset
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // 0=Mon..6=Sun

  const days: Array<{ key: string; day: number; date: string; isCurrentMonth: boolean }> = []

  // Start from the Monday of the first calendar row
  const startDate = new Date(year, month, 1 - firstWeekday)

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const id = `${yyyy}-${mm}-${dd}`

    days.push({
      key: id,
      day: d.getDate(),
      date: id,
      isCurrentMonth: d.getMonth() === month,
    })
  }

  return days
})

const isDayOff = (dateId: string) => config.value.homeServiceDaysOff.includes(dateId)

const hasOverride = (dateId: string) =>
  Boolean(config.value.homeServiceOverrides && config.value.homeServiceOverrides[dateId])

const goToPrevMonth = () => {
  const d = currentMonth.value
  currentMonth.value = new Date(d.getFullYear(), d.getMonth() - 1, 1)
}

const goToNextMonth = () => {
  const d = currentMonth.value
  currentMonth.value = new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

const selectDate = (dateId: string) => {
  selectedDate.value = dateId
}

const overrideDateInput = ref('')

const overrideDates = computed(() =>
  Object.keys(config.value.homeServiceOverrides || {}).sort(),
)

const fetchConfig = async () => {
  try {
    loadingConfig.value = true
    const res = await api.get('/config')
    if (res.data) {
      config.value.travelFee = res.data.travelFee ?? 79.0
      config.value.shippingFee = res.data.shippingFee ?? 10.0
      config.value.homeServiceSlots = res.data.homeServiceSlots ?? []
      config.value.homeServiceDaysOff = res.data.homeServiceDaysOff ?? []
      config.value.homeServiceOverrides = res.data.homeServiceOverrides ?? {}
    }
  } catch (error) {
    console.error('Failed to load config', error)
  } finally {
    loadingConfig.value = false
  }
}

const saveConfig = async () => {
  loading.value = true
  try {
    await api.patch('/config', {
      travelFee: Number(config.value.travelFee),
      shippingFee: Number(config.value.shippingFee),
      homeServiceSlots: [...config.value.homeServiceSlots],
      homeServiceDaysOff: [...config.value.homeServiceDaysOff],
      homeServiceOverrides: { ...(config.value.homeServiceOverrides || {}) },
    })
    snackbar.value = {
      show: true,
      text: 'Settings saved successfully',
      color: 'success',
    }
  } catch (error) {
    console.error('Failed to save config', error)
    snackbar.value = {
      show: true,
      text: 'Failed to update settings',
      color: 'error',
    }
  } finally {
    loading.value = false
  }
}

const addOverrideDate = () => {
  const raw = overrideDateInput.value.trim()
  if (!raw) return

  // Simple YYYY-MM-DD check to avoid obvious typos
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(raw)
  if (!isValidFormat) {
    snackbar.value = {
      show: true,
      text: 'Please enter date as YYYY-MM-DD',
      color: 'error',
    }
    return
  }

  if (!config.value.homeServiceOverrides[raw]) {
    // Start with the global slots as a base for convenience
    config.value.homeServiceOverrides[raw] = [...config.value.homeServiceSlots]
  }
  overrideDateInput.value = raw

  // Also select this date in the calendar/day details
  selectedDate.value = raw
  syncSelectedDateState()
}

const removeOverrideDate = (date: string) => {
  if (config.value.homeServiceOverrides[date]) {
    const next = { ...config.value.homeServiceOverrides }
    delete next[date]
    config.value.homeServiceOverrides = next
  }
}

const syncSelectedDateState = () => {
  const date = selectedDate.value
  if (!date) {
    selectedMode.value = 'global'
    localCustomSlots.value = []
    return
  }

  if (isDayOff(date)) {
    selectedMode.value = 'off'
    localCustomSlots.value = config.value.homeServiceOverrides[date]
      ? [...config.value.homeServiceOverrides[date]]
      : []
    return
  }

  if (hasOverride(date)) {
    selectedMode.value = 'custom'
    localCustomSlots.value = [...config.value.homeServiceOverrides[date]]
    return
  }

  selectedMode.value = 'global'
  localCustomSlots.value = [...config.value.homeServiceSlots]
}

const applySelectedDateChanges = () => {
  const date = selectedDate.value
  if (!date) return

  const daysOff = new Set(config.value.homeServiceDaysOff)
  const overrides = { ...(config.value.homeServiceOverrides || {}) }

  if (selectedMode.value === 'off') {
    daysOff.add(date)
    if (overrides[date]) {
      delete overrides[date]
    }
  } else if (selectedMode.value === 'custom') {
    daysOff.delete(date)
    overrides[date] = [...localCustomSlots.value]
  } else {
    daysOff.delete(date)
    if (overrides[date]) {
      delete overrides[date]
    }
  }

  config.value.homeServiceDaysOff = Array.from(daysOff).sort()
  config.value.homeServiceOverrides = overrides
}

watch(
  () => [selectedDate.value, config.value.homeServiceSlots, config.value.homeServiceDaysOff, config.value.homeServiceOverrides],
  () => {
    syncSelectedDateState()
  },
  { deep: true },
)

onMounted(() => {
  fetchConfig()
})
</script>

<style scoped>
.text-gray-900 {
  color: #111827;
}
.text-gray-500 {
  color: #6b7280;
}
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.border {
  border: 1px solid #e5e7eb;
}
.fade-in {
  animation: fadeIn 0.3s ease-out;
}
.calendar-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.calendar-grid-header {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  margin-bottom: 4px;
}
.calendar-grid-header-cell {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
}
.calendar-grid-body {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}
.calendar-day-cell {
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  padding: 4px 2px;
  min-height: 46px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  cursor: pointer;
}
.calendar-day-cell:disabled {
  opacity: 0.5;
  cursor: default;
}
.calendar-day-number {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}
.calendar-day-meta {
  font-size: 10px;
  color: #6b7280;
}
.calendar-day-outside .calendar-day-number {
  color: #d1d5db;
}
.calendar-day-selected {
  border-color: #4f46e5;
  box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.3);
}
.calendar-day-off {
  background-color: #fef2f2;
  border-color: #fecaca;
}
.calendar-day-override {
  background-color: #eef2ff;
  border-color: #c7d2fe;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
