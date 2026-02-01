import { supabase } from './supabaseClient';
import { Ticket, Employee, ContactMessage } from '../types';

/**
 * Fetch all tickets from Supabase
 * @returns {Promise<Ticket[] | null>} List of tickets
 */
export const getTickets = async (): Promise<Ticket[] | null> => {
  try {
    // Select ticket columns and join with Department to get name
    const { data, error } = await supabase
      .from('Ticket')
      .select(`
        *,
        department:Department(name)
      `)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return null;
    }

    // Convert to Ticket interface
    return (data || []).map((ticket: any) => ({
      id: ticket.id,
      fullName: ticket.citizenName,
      phone: ticket.phone || '', // Note: phone column might be missing in schema
      email: ticket.citizenEmail,
      nationalId: ticket.citizenNationalId,
      requestType: ticket.type,
      department: ticket.department?.name || 'Unknown',
      details: ticket.responseText || '', // Should ideally map from TicketResponse or separate column
      status: ticket.status,     
      submissionDate: new Date(ticket.createdAt),
      startedAt: ticket.startedAt ? new Date(ticket.startedAt) : undefined,
      answeredAt: ticket.answeredAt ? new Date(ticket.answeredAt) : undefined,
      closedAt: ticket.closedAt ? new Date(ticket.closedAt) : undefined,
      attachments: undefined, 
      responseAttachments: undefined
    }));
  } catch (err) {
    console.error('Unexpected error in getTickets:', err);
    return null;
  }
};

// Helper to resolve Department Name to ID
async function getDepartmentId(name: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('Department')
    .select('id')
    .eq('name', name)
    .single();
    
  if (error || !data) return null;
  return data.id;
}

/**
 * Create a new ticket
 * @param {Ticket} ticket - The ticket object to create
 * @returns {Promise<Ticket | null>} The created ticket
 */
export const createTicket = async (ticket: Ticket): Promise<Ticket | null> => {
  try {
    const departmentId = await getDepartmentId(ticket.department);
    if (!departmentId) {
       console.error(`Department '${ticket.department}' not found.`);
       // Proceeding might fail due to foreign key constraint
       return null;
    }

    const { data, error } = await supabase
      .from('Ticket')
      .insert([{
        departmentId: departmentId,
        citizenName: ticket.fullName,
        citizenNationalId: ticket.nationalId,
        citizenEmail: ticket.email,
        type: ticket.requestType,
        status: ticket.status,
        responseText: ticket.details,
        // attachments not handled here (need to upload separately and link)
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return null;
    }

    return {
      ...ticket,
      id: data.id,
      submissionDate: new Date(data.createdAt),
    };
  } catch (err) {
    console.error('Unexpected error in createTicket:', err);
    return null;
  }
};

/**
 * Update an existing ticket
 * @param {string} id - Ticket ID
 * @param {Partial<Ticket>} updates - Fields to update
 * @returns {Promise<Ticket | null>} The updated ticket
 */
export const updateTicket = async (id: string, updates: Partial<Ticket>): Promise<Ticket | null> => {
  try {
    // Map updates to DB columns
    const dbUpdates: any = {};
    // Only map fields that exist in DB and are updateable
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.details) dbUpdates.responseText = updates.details;
    if (updates.answeredAt) dbUpdates.answeredAt = updates.answeredAt;
    if (updates.closedAt) dbUpdates.closedAt = updates.closedAt;
    
    // Note: department update requires lookup if supported
    
    if (Object.keys(dbUpdates).length === 0) return null;

    const { data, error } = await supabase
      .from('Ticket')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return null;
    }

    return {
      ...updates, // Return input updates merged 
      id: id,
    } as Ticket;
  } catch (err) {
    console.error('Unexpected error in updateTicket:', err);
    return null;
  }
};

/**
 * Upload a file to the 'attachments' bucket
 * @param {File} file - The file to upload
 * @returns {Promise<string | null>} The public URL of the uploaded file
 */
export const uploadAttachment = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error in uploadAttachment:', err);
    return null;
  }
};

/**
 * Fetch all employees
 * @returns {Promise<Employee[] | null>} List of employees
 */
export const getEmployees = async (): Promise<Employee[] | null> => {
  try {
    // Attempt to fetch from 'User' table which replaces 'employees'
    const { data, error } = await supabase
      .from('User')
      .select(`
        username,
        email,
        department:Department(name)
      `);

    if (error) {
      console.error('Error fetching employees:', error);
      return null;
    }

    return (data || []).map((u: any) => ({
      username: u.username,
      name: u.username, // Placeholder
      department: u.department?.name || '',
      role: 'موظف', // Placeholder
      password: '', // Cannot retrieve password
      email: u.email
    } as Employee));
  } catch (err) {
    console.error('Unexpected error in getEmployees:', err);
    return null;
  }
};

/**
 * Fetch all contact messages
 * @returns {Promise<ContactMessage[] | null>} List of messages
 */
export const getContactMessages = async (): Promise<ContactMessage[] | null> => {
  try {
    // Note: Table contact_messages might not exist in Prisma schema yet
    const { data, error } = await supabase
      .from('contact_messages') 
      .select('*')
      .order('submissionDate', { ascending: false });

    if (error) {
      // Suppress error if table simple doesn't exist to avoid console spam
      if (error.code !== '42P01') console.error('Error fetching contact messages:', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      ...msg,
      submissionDate: new Date(msg.submissionDate),
    }));
  } catch (err) {
    return [];
  }
};
/**
 * Create a new contact message
 * @param {ContactMessage} message - The message object
 * @returns {Promise<ContactMessage | null>} The created message
 */
export const createContactMessage = async (message: ContactMessage): Promise<ContactMessage | null> => {
  try {
     const { data, error } = await supabase
      .from('contact_messages')
      .insert([message])
      .select()
      .single();

    if (error) {
      console.error('Error creating contact message:', error);
      return null;
    }
    return { ...data, submissionDate: new Date(data.submissionDate) };
  } catch (err) {
    console.error('Unexpected error in createContactMessage:', err);
    return null;
  }
};
