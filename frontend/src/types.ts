export interface Case {
  _id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Image {
  _id: string;
  caseId: string;
  filename: string;
  data: string; // base64 encoded image
  analysisResults: any;
  createdAt: string;
}

export interface Report {
  _id: string;
  caseId: string;
  content: string;
  createdAt: string;
}

export interface Response {
  _id: string;
  caseId: string;
  query: string;
  answer: string;
  createdAt: string;
} 