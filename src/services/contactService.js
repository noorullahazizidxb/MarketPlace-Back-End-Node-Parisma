import { contactRepository } from '../repositories/contactRepository.js';

export const contactService = {
  async createContact(payload) {
    const { name, email, subject, phone, message } = payload;
    return contactRepository.create({ name, email, subject, phone: phone || null, message });
  },
  async listContacts() {
    return contactRepository.list();
  },
  async getContact(id) {
    return contactRepository.getById(id);
  }
};
