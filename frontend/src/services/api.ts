import { Case, Image, Report, Response } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

export const apiService = {
  // Case endpoints
  getCases: async (): Promise<Case[]> => {
    const response = await fetch(`${API_BASE_URL}/cases`);
    if (!response.ok) {
      throw new Error('Failed to fetch cases');
    }
    return response.json();
  },

  getCase: async (caseId: string): Promise<Case> => {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch case');
    }
    return response.json();
  },

  // Image endpoints
  getCaseImages: async (caseId: string): Promise<Image[]> => {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/images`);
    if (!response.ok) {
      throw new Error('Failed to fetch case images');
    }
    return response.json();
  },

  // Report endpoints
  getCaseReports: async (caseId: string): Promise<Report[]> => {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/reports`);
    if (!response.ok) {
      throw new Error('Failed to fetch case reports');
    }
    return response.json();
  },

  // Response endpoints
  getCaseResponses: async (caseId: string): Promise<Response[]> => {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/responses`);
    if (!response.ok) {
      throw new Error('Failed to fetch case responses');
    }
    return response.json();
  },

  // Analysis endpoint
  analyzeImages: async (images: File[], caseId?: string): Promise<{ caseId: string; results: any[] }> => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    
    // Add case_id to the form data if available
    if (caseId) {
      formData.append('case_id', caseId);
    }

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include credentials
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to analyze images');
    }
    return response.json();
  },

  // Query endpoint
  processQuery: async (query: string, image?: File, caseId?: string): Promise<string> => {
    const formData = new FormData();
    formData.append('query', query);
    if (image) {
      formData.append('image', image);
    }
    
    // Add case_id to the form data if available
    if (caseId) {
      formData.append('case_id', caseId);
    }

    const response = await fetch(`${API_BASE_URL}/process_query`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to process query');
    }
    return response.json();
  },
}; 
