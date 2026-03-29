  async getAllUserProducts(
    page = 1,
    limit = 10,
    userId: string
  ): Promise<InventoryData | null> {
    try {
      const response = await this.apiClient.get(
        `get_user_inventory?user_id=${userId}&page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching user products:", error);
      return null;
    }
  }

  async getBundleProducts(bundleId: number): Promise<any> {
    try {
      const response = await this.apiClient.get(
        `get_bundle_products?bundle_id=${bundleId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching bundle products:", error);
      return null;
    }
  } 