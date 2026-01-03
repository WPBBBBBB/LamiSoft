import { supabase } from './supabase'

export interface WhatsAppSettings {
  id: string
  api_key?: string
  per_message_base_delay_ms: number
  per_message_jitter_ms: number
  batch_size: number
  batch_pause_ms: number
  normal_message_title: string
  normal_message_body: string
  notification_message_title: string
  notification_message_body: string
  auto_send_enabled: boolean
  updated_at: string
  updated_by: string
  full_name?: string
}

export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  const { data, error } = await supabase
    .from('whatsapp_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    console.error('Error fetching WhatsApp settings:', error)
    throw error
  }
  
  return data
}

export async function updateWhatsAppSettings(
  settings: Partial<WhatsAppSettings>,
  updatedBy: string = 'user',
  fullName?: string
): Promise<WhatsAppSettings> {
  const { data: currentSettings } = await supabase
    .from('whatsapp_settings')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!currentSettings) {
    console.log('No existing settings found, creating new record...')
    const { data: newData, error: insertError } = await supabase
      .from('whatsapp_settings')
      .insert({
        api_key: settings.api_key || null,
        per_message_base_delay_ms: settings.per_message_base_delay_ms || 3000,
        per_message_jitter_ms: settings.per_message_jitter_ms || 100,
        batch_size: settings.batch_size || 5,
        batch_pause_ms: settings.batch_pause_ms || 6000,
        normal_message_title: settings.normal_message_title || 'رسالة من AL-LamiSoft',
        normal_message_body: settings.normal_message_body || 'مرحباً، هذه رسالة عادية من النظام.',
        notification_message_title: settings.notification_message_title || 'رمز التحقق من AL-LamiSoft',
        notification_message_body: settings.notification_message_body || 'رمز التحقق الخاص بك هو: {CODE}',
        auto_send_enabled: settings.auto_send_enabled ?? true,
        updated_by: updatedBy,
        full_name: fullName || updatedBy,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting WhatsApp settings:', insertError)
      console.error('Insert error details:', JSON.stringify(insertError, null, 2))
      throw new Error(`Failed to insert settings: ${insertError.message || insertError.code || 'Unknown error'}`)
    }

    console.log('Successfully created new settings:', newData)
    return newData
  }

  console.log('Updating existing settings with ID:', currentSettings.id)
  const { data, error } = await supabase
    .from('whatsapp_settings')
    .update({
      ...settings,
      updated_by: updatedBy,
      full_name: fullName || updatedBy,
    })
    .eq('id', currentSettings.id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating WhatsApp settings:', error)
    console.error('Update error details:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to update settings: ${error.message || error.code || 'Unknown error'}`)
  }
  
  console.log('Successfully updated settings:', data)
  return data
}
