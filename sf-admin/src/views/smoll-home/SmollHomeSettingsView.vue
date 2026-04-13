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
            <v-col cols="12">
              <v-combobox
                v-model="config.homeServiceSlots"
                label="Available Time Slots"
                chips
                multiple
                clearable
                variant="outlined"
                color="primary"
                hint="Type a slot (e.g. '09:00 AM') and press Enter. This exact text will be shown in the app."
                persistent-hint
                hide-details="auto"
                :disabled="loading"
              ></v-combobox>
            </v-col>
            <v-col cols="12">
              <v-combobox
                v-model="config.homeServiceDaysOff"
                label="Days Off (Blocked Dates)"
                chips
                multiple
                clearable
                variant="outlined"
                color="error"
                hint="Type a date in YYYY-MM-DD format (e.g. '2026-04-12') and press Enter. The app will hide all slots on these dates."
                persistent-hint
                hide-details="auto"
                :disabled="loading"
              ></v-combobox>
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
import { ref, onMounted } from 'vue'
// Assumes the admin has an axios instance or similar fetch mechanics.
// I will just use fetch as it's simple and works if we know the API URL.
import api from '@/util/api'

const config = ref({
  travelFee: 79.0,
  shippingFee: 10.0,
  homeServiceSlots: [],
  homeServiceDaysOff: [],
})

const loadingConfig = ref(true)
const loading = ref(false)
const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

const fetchConfig = async () => {
  try {
    loadingConfig.value = true
    const res = await api.get('/config')
    if (res.data) {
      config.value.travelFee = res.data.travelFee ?? 79.0
      config.value.shippingFee = res.data.shippingFee ?? 10.0
      config.value.homeServiceSlots = res.data.homeServiceSlots ?? []
      config.value.homeServiceDaysOff = res.data.homeServiceDaysOff ?? []
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
