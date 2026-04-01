import { prisma } from "@/lib/server/prisma";

/**
 * Interface for Lead data from Meta Graph API
 */
export interface MetaLeadData {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id: string;
  page_id: string;
  field_data: {
    name: string;
    values: string[];
  }[];
}

/**
 * Meta Graph API Client for Marktech OS
 */
export class MetaApiClient {
  private static readonly API_VERSION = "v20.0";
  private static readonly BASE_URL = `https://graph.facebook.com/${this.API_VERSION}`;

  private static getAccessToken() {
    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) {
      throw new Error("META_SYSTEM_USER_TOKEN is not configured in .env");
    }
    return token;
  }

  /**
   * Fetches full lead details from Meta Graph API using the leadgen_id
   */
  static async getLeadDetails(leadgenId: string): Promise<MetaLeadData> {
    const url = `${this.BASE_URL}/${leadgenId}?access_token=${this.getAccessToken()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Meta API Error: ${error.error?.message || "Unknown error"}`);
    }

    return response.json();
  }

  /**
   * Fetches Ad Spend Insights for a specific Ad Account
   */
  static async getAdAccountSpend(adAccountId: string, daysBack: number = 30): Promise<number> {
    const url = `${this.BASE_URL}/${adAccountId}/insights?fields=spend&date_preset=this_month&access_token=${this.getAccessToken()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return 0; // Fallback to 0 if unauthorized or error
    }

    const data = await response.json();
    const insights = data.data || [];
    
    // Sum up the spend from insights (usually returns per campaign or account summary)
    return insights.reduce((total: number, entry: any) => total + parseFloat(entry.spend || "0"), 0);
  }
}

/**
 * Utility to parse field_data from Meta into a readable object
 */
export function parseMetaFields(fieldData: MetaLeadData["field_data"]) {
  const result: Record<string, string> = {};
  
  fieldData.forEach((field) => {
    // Basic mapping: generic keys to standard names
    const key = field.name.toLowerCase();
    const value = field.values[0] || "";
    
    if (key.includes("phone")) result.phone = value;
    else if (key.includes("full_name") || key.includes("name")) result.name = value;
    else if (key.includes("email")) result.email = value;
    else result[key] = value;
  });

  return result;
}
