import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  Easing,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift, Shift, InventoryItem } from "../contexts/ShiftContext";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";
import { LinearGradient } from "expo-linear-gradient";
import { ShiftAPI } from "@/api/services";
import { useAuth } from "@/contexts/AuthContext";
import { UserShift } from "@/src/types/apiTypes";

// Add this interface at the top of the file, near other interfaces
interface ExtendedInventoryItem extends InventoryItem {
  original_qty: number;
  count: number;
  has_discrepancy: boolean;
  price?: number;
  sku?: string;
  variant?: string;
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) {
    return "N/A";
  }
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
};

const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined || amount === null) {
    return "R0.00";
  }
  return `R${amount.toFixed(2)}`;
};

const getCashTransactionsTotal = (
  shift: Shift | null,
  type: "add" | "remove"
) => {
  if (
    !shift ||
    !shift.cashTransactions ||
    !Array.isArray(shift.cashTransactions)
  ) {
    return 0;
  }
  return shift.cashTransactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
};

const formatShiftId = (id: string | undefined) => {
  if (!id) return "Unknown";
  if (id.startsWith("shift_") && id.length > 6) {
    return id.substring(6, Math.min(14, id.length));
  }
  return id.substring(0, 8);
};

const EndInventoryStep = ({
  onComplete,
  startInventory,
}: {
  onComplete: (inventory: InventoryItem[]) => void;
  startInventory: InventoryItem[];
}) => {
  const [inventory, setInventory] = useState<ExtendedInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 360;
  const { user } = useAuth();

  // Pagination and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentInventory = async () => {
      try {
        setIsLoading(true);

        // Fetch current inventory data
        if (!user?.id) {
          throw new Error("User ID not available");
        }

        const response = await ShiftAPI.getStoreInventory({ user_id: Number(user.id), no_pagination: true });

        if (response?.data && Array.isArray(response.data)) {
          const apiProducts = response.data;

          // Filter out bundles (products where product_id is null)
          const filteredProducts = apiProducts.filter(
            (product: any) => product.product_id !== null
          );

          // Map API products to inventory items
          const currentInventory: ExtendedInventoryItem[] =
            filteredProducts.map((product: any) => {
              // Use onhand_qty first, then fallback to qty_on_hand
              const qtyOnHand = product.onhand_qty || product.qty_on_hand || 0;
              
              console.log(`[EndInventoryStep] Mapping product ${product.product_id}:`, {
                product_id: product.product_id,
                item_name: product.item_name,
                name: product.name,
                qty_on_hand: product.qty_on_hand,
                onhand_qty: product.onhand_qty,
                final_qty: qtyOnHand,
                sku: product.sku,
                category: product.category,
              });
              
              // Create extended inventory item from API product
              const item: ExtendedInventoryItem = {
                productId: String(product.product_id),
                productName: product.name && product.variant ? `${product.name} - ${product.variant}` : product.name || product.item_name,
                category: product.category || "",
                expectedCount: qtyOnHand,
                actualCount: qtyOnHand, // Set actual count to the API quantity as default
                discrepancy: 0,
                product_id: product.product_id,
                item_name: product.name || product.item_name,
                qty_on_hand: qtyOnHand,
                original_qty: qtyOnHand,
                count: qtyOnHand, // Set count to the API quantity as default
                price: product.price || 0,
                sku: product.sku || "",
                variant: product.variant || "",
              };
              return item;
            });

          setInventory(currentInventory);
        } else {
          throw new Error("Invalid API response format");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load current inventory: ${errorMessage}`);

        // Fall back to using the shift's inventory if API call fails
        const fallbackInventory: ExtendedInventoryItem[] = startInventory.map(
          (item) => ({
            ...item,
            expectedCount: item.actualCount,
            actualCount: 0, // Start with 0 for user to count
            discrepancy: 0,
            sku: item.sku || "",
            variant: item.variant || "",
          })
        );
        setInventory(fallbackInventory);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentInventory();
  }, [user?.id, startInventory]);

  // Reset to first page when changing category or search query
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const handleInventoryChange = (productId: string, actualCount: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            actualCount,
          };
        }
        return item;
      })
    );
  };

  const handleSubmit = () => {
    onComplete(inventory);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
  };

  // Group inventory items by category for display
  const inventoryByCategory = useMemo(() => {
    const groupedInventory: Record<string, InventoryItem[]> = {};

    inventory.forEach((item) => {
      const category = item.category || "Uncategorized";
      if (!groupedInventory[category]) {
        groupedInventory[category] = [];
      }
      groupedInventory[category].push(item);
    });

    return groupedInventory;
  }, [inventory]);

  // Get all unique categories
  const categories = useMemo(() => {
    return Object.keys(inventoryByCategory);
  }, [inventoryByCategory]);

  // Get filtered products based on category and search query
  const filteredItems = useMemo(() => {
    let filtered = inventory;

    // Remove bundles (SKU starts with BDL)
    filtered = filtered.filter(
      (item) => !(item.sku && item.sku.toUpperCase().startsWith("BDL"))
    );

    // Filter by category if selected
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Filter by search query if provided
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.productName.toLowerCase().includes(query)
      );
    }

    // Sort by SKU
    filtered.sort((a, b) => {
      // Handle cases where SKU might be undefined
      if (!a.sku) return 1;
      if (!b.sku) return -1;

      // Split SKU into base number and suffix
      const [aBase, aSuffix] = a.sku
        .split("-")
        .map((part) => parseInt(part) || 0);
      const [bBase, bSuffix] = b.sku
        .split("-")
        .map((part) => parseInt(part) || 0);

      // First compare base numbers
      if (aBase !== bBase) {
        return aBase - bBase;
      }
      // If base numbers are equal, compare suffixes
      return aSuffix - bSuffix;
    });

    return filtered;
  }, [inventory, selectedCategory, searchQuery]);

  // Get paginated results
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Add a loading indicator
  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <GeistText style={[tw`mt-4 text-gray-600`, typography.body]}>
          Loading current inventory...
        </GeistText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center p-4`}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
        <GeistText
          style={[tw`mt-4 text-gray-900 text-center`, typography.bodyBold]}
        >
          {error}
        </GeistText>
        <TouchableOpacity
          style={tw`mt-6 bg-blue-500 py-3 px-6 rounded-lg`}
          onPress={() => onComplete(startInventory)}
        >
          <GeistText style={[tw`text-white`, typography.bodyBold]}>
            Continue With Saved Inventory
          </GeistText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 flex-col`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-3 sm:p-4 md:p-6`}
      >
        <View style={tw`items-center mb-4 sm:mb-6 md:mb-8`}>
          <View
            style={tw`w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-4`}
          >
            <MaterialCommunityIcons
              name="clipboard-check"
              size={36}
              color="#ef4444"
            />
          </View>
          <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
            End of Shift Inventory
          </GeistText>
          <GeistText
            style={[
              tw`text-gray-500 text-center mt-2 max-w-sm`,
              typography.body,
            ]}
          >
            Verify your final inventory counts before ending your shift
          </GeistText>
        </View>

        <View style={tw`bg-white rounded-xl p-4 border border-gray-100 mb-4`}>
          <View style={tw`flex-row items-center mb-3`}>
            <MaterialCommunityIcons
              name="clipboard-list"
              size={18}
              color="#ef4444"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-700`, typography.bodyBold]}>
              Count and verify each product
            </GeistText>
          </View>

          {/* Instructions card */}
          <View style={tw`bg-red-50 rounded-lg p-3 mb-4`}>
            <View style={tw`flex-row items-center`}>
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color="#ef4444"
                style={tw`mr-2`}
              />
              <GeistText
                style={[tw`text-red-700 flex-1`, typography.captionSemibold]}
              >
                Count each product carefully and enter the actual quantity on
                hand
              </GeistText>
            </View>
          </View>

          {/* Search Bar */}
          <View style={tw`relative mb-4`}>
            <TextInput
              style={[
                tw`border border-gray-200 rounded-lg py-2 px-10 bg-white`,
                typography.body,
              ]}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color="#9ca3af"
              style={tw`absolute left-3 top-2.5`}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={tw`absolute right-3 top-2.5`}
                onPress={handleSearchClear}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={tw`mb-4`}>
              <GeistText style={[tw`text-gray-700 mb-2`, typography.bodyBold]}>
                Product Categories
              </GeistText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={tw`flex-row gap-2`}>
                  <TouchableOpacity
                    key="all-categories"
                    onPress={() => setSelectedCategory(null)}
                    style={[
                      tw`rounded-full px-4 py-2 mr-2`,
                      selectedCategory === null
                        ? tw`bg-red-500`
                        : tw`bg-gray-100`,
                    ]}
                  >
                    <GeistText
                      style={[
                        selectedCategory === null
                          ? tw`text-white`
                          : tw`text-gray-700`,
                        typography.captionSemibold,
                      ]}
                    >
                      All
                    </GeistText>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setSelectedCategory(category)}
                      style={[
                        tw`rounded-full px-4 py-2 mr-2`,
                        selectedCategory === category
                          ? tw`bg-red-500`
                          : tw`bg-gray-100`,
                      ]}
                    >
                      <GeistText
                        style={[
                          selectedCategory === category
                            ? tw`text-white`
                            : tw`text-gray-700`,
                          typography.captionSemibold,
                        ]}
                      >
                        {category}
                      </GeistText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Pagination header */}
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <GeistText style={[tw`text-gray-700`, typography.bodyBold]}>
              {selectedCategory
                ? `${selectedCategory} Products`
                : searchQuery
                ? "Search Results"
                : "All Products"}
            </GeistText>

            <GeistText style={[tw`text-gray-500`, typography.caption]}>
              {filteredItems.length} product(s) • Page {currentPage} of{" "}
              {totalPages || 1}
            </GeistText>
          </View>

          {paginatedItems.length > 0 ? (
            <View>
              {/* Display paginated items */}
              {paginatedItems.map((item) => (
                <View
                  key={item.productId}
                  style={tw`border-b border-gray-100 py-3`}
                >
                  <View style={tw`flex-row justify-between items-center mb-2`}>
                    <View style={tw`flex-1`}>
                      <GeistText
                        style={[tw`text-gray-900`, typography.bodyBold]}
                      >
                        {item.productName}
                      </GeistText>
                      {/* Display SKU and Variant information */}
                      <View style={tw`flex-row flex-wrap mt-1`}>
                        {item.sku && (
                          <GeistText
                            style={[tw`text-gray-500 mr-3`, typography.caption]}
                          >
                            SKU: {item.sku}
                          </GeistText>
                        )}
                        {item.variant && item.variant !== item.productName && (
                          <GeistText
                            style={[tw`text-gray-500`, typography.caption]}
                          >
                            Variant: {item.variant}
                          </GeistText>
                        )}
                      </View>
                      {/* Safely access price property if it exists */}
                      {(item as ExtendedInventoryItem).price !== undefined && (
                        <GeistText
                          style={[tw`text-gray-500 mt-1`, typography.caption]}
                        >
                          Price: R
                          {(
                            (item as ExtendedInventoryItem).price! / 100
                          ).toFixed(2)}
                        </GeistText>
                      )}
                    </View>

                    <View style={tw`flex-row items-center`}>
                      <View style={tw`items-end mr-3`}>
                        <GeistText
                          style={[
                            tw`text-gray-600`,
                            typography.captionSemibold,
                          ]}
                        >
                          Count
                        </GeistText>
                      </View>

                      <View style={tw`relative w-20`}>
                        <TextInput
                          style={[
                            tw`border border-gray-200 bg-white rounded-lg p-2 text-center w-full`,
                            typography.body,
                          ]}
                          keyboardType="numeric"
                          value={String(item.actualCount || (item as any).count || item.qty_on_hand || 0)}
                          onChangeText={(text) =>
                            handleInventoryChange(
                              item.productId,
                              text ? parseInt(text, 10) : 0
                            )
                          }
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {/* Pagination controls */}
              {totalPages > 1 && (
                <View
                  style={tw`flex-row justify-between items-center mt-4 pt-2 border-t border-gray-100`}
                >
                  <TouchableOpacity
                    onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={[
                      tw`px-3 py-2 rounded-lg flex-row items-center`,
                      currentPage === 1 ? tw`opacity-50` : tw`bg-gray-100`,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={18}
                      color="#4b5563"
                      style={tw`mr-1`}
                    />
                    <GeistText style={[tw`text-gray-700`, typography.caption]}>
                      Previous
                    </GeistText>
                  </TouchableOpacity>

                  <View style={tw`flex-row items-center`}>
                    {totalPages > 5 ? (
                      <>
                        {currentPage > 2 && (
                          <TouchableOpacity
                            onPress={() => setCurrentPage(1)}
                            style={[
                              tw`w-8 h-8 rounded-full justify-center items-center mx-0.5`,
                              currentPage === 1
                                ? tw`bg-red-500`
                                : tw`bg-gray-100`,
                            ]}
                          >
                            <GeistText
                              style={[
                                currentPage === 1
                                  ? tw`text-white`
                                  : tw`text-gray-700`,
                                typography.caption,
                              ]}
                            >
                              1
                            </GeistText>
                          </TouchableOpacity>
                        )}

                        {currentPage > 3 && (
                          <GeistText
                            style={[tw`mx-1 text-gray-400`, typography.caption]}
                          >
                            ...
                          </GeistText>
                        )}

                        {Array.from({ length: 3 }, (_, i) => {
                          // Calculate the page number to display
                          let pageNum = currentPage;
                          if (currentPage === 1) {
                            pageNum = i + 1;
                          } else if (currentPage === totalPages) {
                            pageNum = totalPages - 2 + i;
                          } else {
                            pageNum = currentPage - 1 + i;
                          }

                          // Only show valid page numbers
                          if (pageNum < 1 || pageNum > totalPages) return null;

                          return (
                            <TouchableOpacity
                              key={pageNum}
                              onPress={() => setCurrentPage(pageNum)}
                              style={[
                                tw`w-8 h-8 rounded-full justify-center items-center mx-0.5`,
                                currentPage === pageNum
                                  ? tw`bg-red-500`
                                  : tw`bg-gray-100`,
                              ]}
                            >
                              <GeistText
                                style={[
                                  currentPage === pageNum
                                    ? tw`text-white`
                                    : tw`text-gray-700`,
                                  typography.caption,
                                ]}
                              >
                                {pageNum}
                              </GeistText>
                            </TouchableOpacity>
                          );
                        })}

                        {currentPage < totalPages - 2 && (
                          <GeistText
                            style={[tw`mx-1 text-gray-400`, typography.caption]}
                          >
                            ...
                          </GeistText>
                        )}

                        {currentPage < totalPages - 1 && (
                          <TouchableOpacity
                            onPress={() => setCurrentPage(totalPages)}
                            style={[
                              tw`w-8 h-8 rounded-full justify-center items-center mx-0.5`,
                              currentPage === totalPages
                                ? tw`bg-red-500`
                                : tw`bg-gray-100`,
                            ]}
                          >
                            <GeistText
                              style={[
                                currentPage === totalPages
                                  ? tw`text-white`
                                  : tw`text-gray-700`,
                                typography.caption,
                              ]}
                            >
                              {totalPages}
                            </GeistText>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      // Simple pagination for fewer pages
                      Array.from({ length: totalPages }, (_, i) => (
                        <TouchableOpacity
                          key={i + 1}
                          onPress={() => setCurrentPage(i + 1)}
                          style={[
                            tw`w-8 h-8 rounded-full justify-center items-center mx-0.5`,
                            currentPage === i + 1
                              ? tw`bg-red-500`
                              : tw`bg-gray-100`,
                          ]}
                        >
                          <GeistText
                            style={[
                              currentPage === i + 1
                                ? tw`text-white`
                                : tw`text-gray-700`,
                              typography.caption,
                            ]}
                          >
                            {i + 1}
                          </GeistText>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    style={[
                      tw`px-3 py-2 rounded-lg flex-row items-center`,
                      currentPage === totalPages
                        ? tw`opacity-50`
                        : tw`bg-gray-100`,
                    ]}
                  >
                    <GeistText style={[tw`text-gray-700`, typography.caption]}>
                      Next
                    </GeistText>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={18}
                      color="#4b5563"
                      style={tw`ml-1`}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Items per page selector */}
              <View style={tw`flex-row justify-end items-center mt-4`}>
                <GeistText style={[tw`text-gray-500 mr-2`, typography.caption]}>
                  Items per page:
                </GeistText>
                <View style={tw`flex-row bg-gray-100 rounded-lg`}>
                  {[10, 20, 50, 100].map((value) => (
                    <TouchableOpacity
                      key={value}
                      onPress={() => {
                        setItemsPerPage(value);
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                      style={[
                        tw`px-2 py-1 rounded-lg`,
                        itemsPerPage === value ? tw`bg-red-500` : {},
                      ]}
                    >
                      <GeistText
                        style={[
                          itemsPerPage === value
                            ? tw`text-white`
                            : tw`text-gray-700`,
                          typography.caption,
                        ]}
                      >
                        {value}
                      </GeistText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={tw`bg-gray-50 rounded-lg p-4 items-center`}>
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                {searchQuery
                  ? "No products found matching your search."
                  : selectedCategory
                  ? "No products found in this category."
                  : "No products available."}
              </GeistText>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={tw`px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white`}
      >
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-xl py-3 sm:py-4 px-4 sm:px-6 flex-row justify-center items-center`}
          onPress={handleSubmit}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color="white"
            style={tw`mr-2`}
          />
          <GeistText style={[tw`text-white`, typography.bodyBold]}>
            Continue
          </GeistText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CashEntryStep = ({
  onComplete,
}: {
  onComplete: (amount: number) => void;
}) => {
  const [amount, setAmount] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { width } = useWindowDimensions();
  const isSmallMobile = width < 360;
  const { currentShift } = useShift();

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    const endCash = parseFloat(amount);
    const startCash = currentShift?.startCash || 0;
    const cashSales = currentShift?.cashSales || 0;
    // Note: payouts is not available in this component, so we'll use 0 for the validation
    // The full validation will happen in the summary step
    const expectedCash = startCash + cashSales; // Simplified for this step
    const difference = endCash - expectedCash;

    // If there's a shortage (less cash than expected)
    if (difference < -10) {
      Alert.alert(
        "Cash Shortage",
        "There is a shortage of " +
          CurrencyFormat.format(Math.abs(difference)) +
          ".\n\n" +
          "Please verify the count and check for any missing cash before continuing.",
        [
          {
            text: "Review",
            style: "cancel",
          },
          {
            text: "Continue Anyway",
            onPress: () => onComplete(endCash),
          },
        ]
      );
    }
    // If there's a significant overage (more than R10000 extra)
    else if (difference > 10000) {
      Alert.alert(
        "Significant Cash Overage",
        "There is an overage of " +
          CurrencyFormat.format(difference) +
          ".\n\n" +
          "Please verify the count and check for any duplicate entries before continuing.",
        [
          {
            text: "Review",
            style: "cancel",
          },
          {
            text: "Continue Anyway",
            onPress: () => onComplete(endCash),
          },
        ]
      );
    } else {
      onComplete(endCash);
    }
  };

  return (
    <View style={tw`flex-1 flex-col`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-3 sm:p-4 md:p-6`}
      >
        <View style={tw`items-center mb-4 sm:mb-6 md:mb-8`}>
          <View
            style={tw`w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4`}
          >
            <MaterialCommunityIcons
              name="cash-register"
              size={36}
              color="#3b82f6"
            />
          </View>
          <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
            Enter Ending Cash
          </GeistText>
          <GeistText
            style={[
              tw`text-gray-500 text-center mt-2 max-w-sm`,
              typography.body,
            ]}
          >
            Count all cash in your drawer at the end of your shift
          </GeistText>
        </View>

        <View
          style={tw`bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-gray-100  mb-4`}
        >
          <View style={tw`flex-row items-center mb-3`}>
            <MaterialCommunityIcons
              name="cash"
              size={18}
              color="#3b82f6"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-700`, typography.bodyBold]}>
              Ending Cash Amount
            </GeistText>
          </View>

          <View style={tw`relative mb-3`}>
            <View style={tw`flex-row items-center`}>
              <TextInput
                style={[
                  tw`border rounded-xl py-3 pl-9 pr-3 text-2xl md:text-3xl text-gray-900 w-full border-gray-200 bg-white`,
                  typography.h3,
                ]}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                autoFocus
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <Text
                style={[
                  tw`absolute left-4 text-2xl md:text-3xl text-gray-600`,
                  typography.h3,
                ]}
              >
                R
              </Text>
            </View>
          </View>

          {/* Quick amount buttons */}
          <View style={tw`flex-row flex-wrap -mx-1 mb-2`}>
            {[100, 200, 500, 1000].map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={tw`px-1 w-1/4 mb-2`}
                onPress={() => setAmount(quickAmount.toString())}
              >
                <View
                  style={tw`bg-blue-50 border border-blue-100 rounded-lg py-2 px-1`}
                >
                  <GeistText
                    style={[
                      tw`text-blue-700 text-center`,
                      typography.captionSemibold,
                    ]}
                  >
                    R{quickAmount.toFixed(2)}
                  </GeistText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Expected cash summary */}
        <View
          style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
        >
          <GeistText style={[tw`text-gray-900 mb-3`, typography.bodyBold]}>
            Expected Cash
          </GeistText>
          <View style={tw`space-y-2`}>
            <View style={tw`flex-row justify-between items-center`}>
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Starting Float
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                <CurrencyFormat value={currentShift?.startCash} />
              </GeistText>
            </View>
            <View style={tw`flex-row justify-between items-center`}>
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Cash Sales
              </GeistText>
              <GeistText style={[tw`text-green-600`, typography.bodyBold]}>
                +<CurrencyFormat value={currentShift?.cashSales} />
              </GeistText>
            </View>
            <View style={tw`border-t border-gray-100 pt-2 mt-2`}>
              <View style={tw`flex-row justify-between items-center`}>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  Expected in Drawer (before payouts)
                </GeistText>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  <CurrencyFormat
                    value={
                      (currentShift?.startCash || 0) +
                      (currentShift?.cashSales || 0)
                    }
                  />
                </GeistText>
              </View>
            </View>
            <View style={tw`bg-blue-50 rounded-lg p-2 mt-2`}>
              <GeistText
                style={[tw`text-blue-800 text-xs`, typography.caption]}
              >
                Note: Payouts will be deducted in the next step
              </GeistText>
            </View>
          </View>
        </View>

        {/* Add helpful tips */}
        <View
          style={tw`bg-blue-50 rounded-xl p-4 sm:p-5 border border-blue-100 mb-4`}
        >
          <View style={tw`flex-row items-center mb-2`}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={18}
              color="#3b82f6"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-blue-800`, typography.bodyBold]}>
              Tips for Accurate Cash Count
            </GeistText>
          </View>
          <View style={tw`space-y-2`}>
            <View style={tw`flex-row items-start`}>
              <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2 mt-1.5`} />
              <GeistText style={[tw`text-blue-800 flex-1`, typography.body]}>
                Count cash in a quiet area
              </GeistText>
            </View>
            <View style={tw`flex-row items-start`}>
              <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2 mt-1.5`} />
              <GeistText style={[tw`text-blue-800 flex-1`, typography.body]}>
                Count each denomination separately
              </GeistText>
            </View>
            <View style={tw`flex-row items-start`}>
              <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2 mt-1.5`} />
              <GeistText style={[tw`text-blue-800 flex-1`, typography.body]}>
                Double-check for any hidden cash
              </GeistText>
            </View>
            <View style={tw`flex-row items-start`}>
              <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2 mt-1.5`} />
              <GeistText style={[tw`text-blue-800 flex-1`, typography.body]}>
                Verify all cash sales are recorded
              </GeistText>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={tw`px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white`}
      >
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-xl py-3 sm:py-4 px-4 sm:px-6 flex-row justify-center items-center`}
          onPress={handleSubmit}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color="white"
            style={tw`mr-2`}
          />
          <GeistText style={[tw`text-white`, typography.bodyBold]}>
            Continue to Inventory Count
          </GeistText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PayoutsStep = ({
  onComplete,
}: {
  onComplete: (payouts: number) => void;
}) => {
  const [payouts, setPayouts] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { width } = useWindowDimensions();
  const isSmallMobile = width < 360;

  const handleSubmit = () => {
    if (!payouts || parseFloat(payouts) < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payout amount");
      return;
    }
    onComplete(parseFloat(payouts));
  };

  // Format the currency as the user types
  const formattedAmount = useMemo(() => {
    if (!payouts) return "";
    const value = parseFloat(payouts);
    if (isNaN(value)) return "";
    return "R" + value.toFixed(2);
  }, [payouts]);

  return (
    <View style={tw`flex-1 flex-col`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-3 sm:p-4 md:p-6`}
      >
        <View style={tw`items-center mb-4 sm:mb-6 md:mb-8`}>
          <View
            style={tw`w-20 h-20 rounded-full bg-orange-100 items-center justify-center mb-4`}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={36}
              color="#f59e0b"
            />
          </View>
          <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
            Payouts
          </GeistText>
          <GeistText
            style={[
              tw`text-gray-500 text-center mt-2 max-w-sm`,
              typography.body,
            ]}
          >
            Enter the total amount paid out during this shift
          </GeistText>
        </View>

        <View
          style={tw`bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-gray-100  mb-4 sm:mb-6`}
        >
          <View style={tw`flex-row items-center mb-3`}>
            <MaterialCommunityIcons
              name="cash-register"
              size={18}
              color="#f59e0b"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-700`, typography.bodyBold]}>
              Total Payouts
            </GeistText>
          </View>

          <View style={tw`relative`}>
            <View style={tw`flex-row items-center`}>
              <TextInput
                style={[
                  tw`border rounded-xl py-3 pl-9 pr-3 text-2xl md:text-3xl text-gray-900 w-full border-gray-200 bg-white`,
                  typography.h3,
                ]}
                keyboardType="numeric"
                value={payouts}
                onChangeText={setPayouts}
                placeholder="0.00"
                autoFocus
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <Text
                style={[
                  tw`absolute left-4 text-2xl md:text-3xl text-gray-600`,
                  typography.h3,
                ]}
              >
                R
              </Text>
            </View>
          </View>
        </View>

        <View
          style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
        >
          <GeistText style={[tw`text-gray-900 mb-3`, typography.bodyBold]}>
            What are payouts?
          </GeistText>
          <GeistText style={[tw`text-gray-600 mb-3`, typography.body]}>
            Payouts are expenses paid from the cash drawer during your shift,
            including:
          </GeistText>
          <View style={tw`space-y-2 pl-2`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-2 h-2 rounded-full bg-orange-500 mr-2`} />
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Supplier payments
              </GeistText>
            </View>
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-2 h-2 rounded-full bg-orange-500 mr-2`} />
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Refunds to customers
              </GeistText>
            </View>
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-2 h-2 rounded-full bg-orange-500 mr-2`} />
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Petty cash expenses
              </GeistText>
            </View>
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-2 h-2 rounded-full bg-orange-500 mr-2`} />
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Emergency purchases
              </GeistText>
            </View>
          </View>
        </View>

        <View
          style={tw`bg-orange-50 rounded-xl p-4 sm:p-5 border border-orange-100 mb-4`}
        >
          <View style={tw`flex-row mb-2`}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color="#f59e0b"
              style={tw`mr-2 mt-0.5`}
            />
            <GeistText style={[tw`text-orange-900`, typography.bodyBold]}>
              Important
            </GeistText>
          </View>
          <GeistText style={[tw`text-orange-800`, typography.body]}>
            Make sure to have receipts or documentation for all payouts. If you
            have no payouts for this shift, enter 0.
          </GeistText>
        </View>
      </ScrollView>

      <View
        style={tw`px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white`}
      >
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-xl py-3 sm:py-4 px-4 sm:px-6 flex-row justify-center items-center`}
          onPress={handleSubmit}
        >
          <MaterialCommunityIcons
            name="arrow-right-circle"
            size={20}
            color="white"
            style={tw`mr-2`}
          />
          <GeistText style={[tw`text-white`, typography.bodyBold]}>
            Continue to Summary
          </GeistText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function EndShiftScreen() {
  const { currentShift, endShift } = useShift();
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<
    "inventory" | "cash" | "payouts" | "summary" | "submitting"
  >("inventory");
  const [endCash, setEndCash] = useState(0);
  const [payouts, setPayouts] = useState(0);
  const [endInventory, setEndInventory] = useState<InventoryItem[]>([]);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shiftId, setShiftId] = useState<string>("");
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 360;

  // Animation for loading indicator
  const loadingAnimation = React.useRef(new Animated.Value(0)).current;
  const progressValue = React.useRef(new Animated.Value(0)).current;
  const [processingStep, setProcessingStep] = useState(0);
  const processingSteps = [
    "Validating data",
    "Processing cash data",
    "Processing inventory data",
    "Finalizing shift",
    "Generating report",
  ];

  // Add this at the beginning of the file with other state variables in the EndShiftScreen component
  const fadeTiming = React.useRef(new Animated.Value(0)).current;

  // Jump to correct step based on active shift status from backend
  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return;
        const active = await ShiftAPI.getActiveShift({ user_id: Number(user.id) });
        const status = (active?.active_shift as any)?.status as string | undefined;
        switch (status) {
          case "INVENTORY_PENDING":
            setStep("inventory");
            break;
          case "CASH_PENDING":
            setStep("cash");
            break;
          case "SUSPENDED":
          case "OPEN":
            // If open and inventory/cash might be pending, start at inventory
            setStep("inventory");
            break;
          case "CLOSED":
          case "APPROVED":
            setStep("summary");
            break;
          default:
            // Fallback: start at inventory
            setStep("inventory");
        }
      } catch {
        // ignore and keep default
      }
    })();
  }, [user?.id]);

  // Initialize shiftId from currentShift when component mounts
  useEffect(() => {
    if (currentShift && currentShift.id) {
      setShiftId(String(currentShift.id));
      console.log(
        `[EndShiftScreen] Initialized shift ID from current shift: ${currentShift.id}`
      );
    }
  }, [currentShift]);

  React.useEffect(() => {
    if (step === "submitting") {
      // Create an infinite animation
      Animated.loop(
        Animated.timing(loadingAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();

      // Progress animation
      let stepDuration = 1000;
      processingSteps.forEach((_, index) => {
        setTimeout(() => {
          setProcessingStep(index);
          Animated.timing(progressValue, {
            toValue: (index + 1) / processingSteps.length,
            duration: stepDuration,
            useNativeDriver: false,
            easing: Easing.ease,
          }).start();
        }, index * stepDuration);
      });
    } else if (step === "summary") {
      // Fade in the summary screen
      fadeTiming.setValue(0);
      Animated.timing(fadeTiming, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      // Reset animation when not loading
      loadingAnimation.setValue(0);
      progressValue.setValue(0);
      setProcessingStep(0);
    }
  }, [step]);

  // If no active shift, redirect back
  useEffect(() => {
    if (!currentShift) {
      router.replace("/(tabs)/shifts");
    }
  }, [currentShift, router]);

  const handleEndCash = (amount: number) => {
    setEndCash(amount);
    setStep("payouts");
  };

  const handlePayouts = (amount: number) => {
    setPayouts(amount);
    setStep("summary");
  };

  const handleEndInventory = async (endInventory: InventoryItem[]) => {
    try {
      setEndInventory(endInventory);
      setStep("cash");

      if (!currentShift) {
        Alert.alert("Error", "No active shift found");
        return;
      }

      // Use the admin user ID from the current shift that started the shift
      // This follows the pattern in StartShiftScreen and ensures consistency
      const userIdForApi = Number(currentShift.userId || user?.id || 0);

      // Get the admin staff ID and store ID for the API calls
      const staffId =
        currentShift.staffId || user?.staffId || `STAFF_${userIdForApi}`;
      const storeId = currentShift.storeId || 1;

      console.log(
        `Ending inventory with admin ID: ${userIdForApi}, staff ID: ${staffId}, store ID: ${storeId}`
      );

      try {
        // Use new API to retrieve active shift
        const active = await ShiftAPI.getActiveShift({ user_id: userIdForApi });
        if (!active.has_active_shift || !active.active_shift) {
          throw new Error("No active shift to close");
        }
        const shiftId = active.active_shift.shift_id;

        // Format the inventory data for API
        const apiInventoryData = endInventory
          .filter(
            (item) =>
              item.productId &&
              item.productId !== "null" &&
              item.productId !== "undefined"
          )
          .map((item) => ({
            product_id: item.productId
              ? parseInt(item.productId)
              : item.product_id || 0,
            qty: item.actualCount || 0,
          }));

        // Call the closeInventory API to set status to 3 - include staff and store IDs
        const closeInventoryResponse = await ShiftAPI.recordClosingInventory({
          user_id: userIdForApi,
          shift_id: shiftId,
          products: apiInventoryData.map((p) => ({
            product_id: Number(p.product_id),
            expected_qty: undefined as unknown as number, // server calculates
            actual_qty: Number(p.qty),
            comments: "Closing inventory recorded",
          })),
          comments: "Closing inventory recorded",
        });

        if (!closeInventoryResponse || closeInventoryResponse.status !== "success") {
          Alert.alert(
            "Warning",
            "There was an issue recording your inventory count. You can continue, but there might be issues closing the shift.",
            [{ text: "Continue Anyway" }]
          );
        }

        // Store the inventory data locally and proceed to next step
        setEndInventory(endInventory);
        setStep("cash");
      } catch (apiError: any) {
        Alert.alert(
          "Error",
          `Failed to retrieve shift information: ${
            apiError.message || "Unknown error"
          }. Please try again.`
        );
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to record inventory. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  // Modify the handleFinalSubmit method for smoother transitions
  const handleFinalSubmit = async () => {
    try {
      // Set loading state immediately to prevent UI flashing
      setIsSubmitting(true);
      setStep("submitting");
      setProcessingStep(0);

      // Start the loading animation immediately
      Animated.loop(
        Animated.timing(loadingAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();

      // Start the step-by-step progress indicator
      let stepDuration = 800;
      for (let i = 0; i < processingSteps.length; i++) {
        setTimeout(() => {
          setProcessingStep(i);
          Animated.timing(progressValue, {
            toValue: (i + 1) / processingSteps.length,
            duration: stepDuration,
            useNativeDriver: false,
            easing: Easing.ease,
          }).start();
        }, i * stepDuration);
      }

      // Give UI time to update before proceeding with API calls
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!currentShift) {
        throw new Error("No active shift found");
      }

      // Get the admin user ID from the current shift or auth context
      // This follows the pattern used in StartShiftScreen where admin starts the shift
      const userIdForApi = Number(currentShift.userId || user?.id || 0);

      // Use the admin data from the current shift that was started
      // This ensures we're using the same admin credentials that started the shift
      const staffId =
        currentShift.staffId || user?.staffId || `STAFF_${userIdForApi}`;
      console.log(`Using admin ID: ${userIdForApi}, staff ID: ${staffId}`);

      const storeId = currentShift.storeId || 1;

      let correctShiftId;

      try {
        const active = await ShiftAPI.getActiveShift({ user_id: userIdForApi });
        if (!active.has_active_shift || !active.active_shift) {
          throw new Error("No active shift found");
        }
        // Always update the shiftId state with the correct shift
        setShiftId(active.active_shift.shift_id.toString());
        correctShiftId = active.active_shift.shift_id;
      } catch (fetchError: any) {
        console.error("Error fetching user shifts:", fetchError);
        throw new Error(
          `Could not verify shift ID: ${fetchError.message || "Unknown error"}`
        );
      }

      // Cash calculations
      const startCash = currentShift.startCash || 0;
      const cashSales = currentShift.cashSales || 0;
      // Simplified calculation: Opening Cash + Cash Sales - Bank Deposits (Payouts) = Expected Closing Cash
      const expectedCash = startCash + cashSales - payouts;
      const difference = endCash - expectedCash;

      // Check individual flag conditions
      const cashShortage = difference < -10;
      const cashOverage = difference > 10000;

      // Determine if the shift should be flagged based on cash discrepancies only
      const shouldFlag =
        cashShortage || // Shortage greater than R10
        cashOverage; // Overage greater than R10000

      // No explicit status update endpoint in new API; proceed to close

      // Step 5: Finalize the shift with closeShift API call
      try {
        // Call the endShift function with the properly formatted data
        // Using admin credentials to end the shift
        await endShift({
          userId: userIdForApi, // Use admin ID from the shift
          shiftId: correctShiftId,
          dateTime: new Date().toISOString(),
          payouts: payouts,
          closingCash: endCash,
          comments: comments || "",
          flagCash: shouldFlag,
        });

        // If we get here, assume success and continue with the UI flow

        // The steps animation will already be running, so we don't need to set these again
        // Just ensure we complete all steps

        // Allow a small delay for animations to finish
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Success, so show alert and navigate
        Alert.alert(
          "Shift Ended",
          shouldFlag
            ? "Your shift has been flagged for review due to discrepancies."
            : "Your shift has been successfully closed.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/shifts") }],
          { cancelable: false }
        );
      } catch (endError: any) {
        console.error("Error in endShift:", endError);
        throw new Error(
          `Failed to complete the shift: ${
            endError?.message || "Unknown API error"
          }`
        );
      }
    } catch (error: any) {
      console.error("Shift closing error:", error);

      // Even if error occurred, wait a bit before showing to avoid UI flashing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Stop all animations
      loadingAnimation.stopAnimation();
      progressValue.stopAnimation();

      // Reset to summary view with error
      setIsSubmitting(false);
      setStep("summary");

      // Show error alert
      Alert.alert(
        "Error",
        `Failed to close shift: ${error?.message || "Unknown error"}`,
        [{ text: "OK" }]
      );
    }
  };

  const renderStepIndicator = (stepName: string, index: number) => {
    const steps = [
      { id: "inventory", name: "Inventory" },
      { id: "cash", name: "Cash" },
      { id: "payouts", name: "Payouts" },
      { id: "summary", name: "Summary" },
    ];

    const currentIndex = steps.findIndex((s) => s.id === step);
    const isCompleted = index < currentIndex;
    const isActive = index === currentIndex;

    return (
      <View key={stepName} style={tw`flex-1`}>
        <View style={tw`flex-row items-center justify-center`}>
          {/* Line before the first step */}
          {index === 0 && <View style={tw`flex-1 h-0.5 bg-transparent`} />}

          {/* Line before circle */}
          {index > 0 && (
            <View
              style={tw`flex-1 h-0.5 ${
                index <= currentIndex ? "bg-blue-500" : "bg-gray-200"
              }`}
            />
          )}

          <View
            style={tw`w-8 h-8 rounded-full ${
              isCompleted
                ? "bg-blue-500"
                : isActive
                ? "bg-blue-100 border-2 border-blue-500"
                : "bg-gray-200"
            } justify-center items-center mx-1`}
          >
            {isCompleted ? (
              <MaterialCommunityIcons name="check" size={16} color="white" />
            ) : (
              <GeistText
                style={[
                  tw`${isActive ? "text-blue-500" : "text-gray-500"}`,
                  typography.captionSemibold,
                ]}
              >
                {index + 1}
              </GeistText>
            )}
          </View>

          {/* Line after circle */}
          {index < steps.length - 1 && (
            <View
              style={tw`flex-1 h-0.5 ${
                index < currentIndex ? "bg-blue-500" : "bg-gray-200"
              }`}
            />
          )}

          {/* Line after the last step */}
          {index === steps.length - 1 && (
            <View style={tw`flex-1 h-0.5 bg-transparent`} />
          )}
        </View>

        <GeistText
          style={[
            tw`text-center mt-2 ${
              isActive ? "text-blue-500" : "text-gray-500"
            }`,
            typography.caption,
          ]}
        >
          {steps[index].name}
        </GeistText>
      </View>
    );
  };

  // Calculate expected values for the summary
  const summaryData = useMemo(() => {
    if (!currentShift) return null;

    const startCash = currentShift.startCash;
    const cashSales = currentShift.cashSales;

    // Simplified calculation: Opening Cash + Cash Sales - Bank Deposits (Payouts) = Expected Closing Cash
    const expectedCash = startCash + cashSales - payouts;
    const cashDifference = endCash - expectedCash;

    return {
      startCash,
      cashSales,
      payouts, // This represents bank deposits/cash payouts
      expectedCash,
      endCash,
      cashDifference,
      totalSales: currentShift.salesTotal,
      transactionCount: currentShift.transactionCount,
    };
  }, [currentShift, endCash, payouts]);

  if (!currentShift) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (step === "summary" && summaryData) {
    return (
      <Animated.View style={[tw`flex-1 bg-gray-50`, { opacity: fadeTiming }]}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={["#ef4444", "#dc2626"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw`p-3 sm:p-5 md:p-6`}
        >
          <GeistText
            style={[
              tw`text-white ${isMobile ? "text-xl" : "text-2xl"}`,
              typography.h1,
            ]}
          >
            End Shift
          </GeistText>
          <GeistText style={[tw`text-white opacity-80 mt-1`, typography.body]}>
            Review your shift details
          </GeistText>
        </LinearGradient>

        {/* Step indicator */}
        <View style={tw`px-4 py-3 bg-white border-b border-gray-100`}>
          <View style={tw`flex-row justify-between`}>
            {["inventory", "cash", "payouts", "summary"].map((s, i) =>
              renderStepIndicator(s, i)
            )}
          </View>
        </View>

        {/* Content here */}
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`p-4 sm:p-6 md:p-8`}
        >
          {/* Summary content */}
          <View style={tw`items-center mb-4 sm:mb-6 md:mb-8`}>
            <View
              style={tw`w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4`}
            >
              <MaterialCommunityIcons
                name="clipboard-check-outline"
                size={36}
                color="#10b981"
              />
            </View>
            <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
              End of Shift Summary
            </GeistText>
            <GeistText
              style={[
                tw`text-gray-500 text-center mt-2 max-w-sm`,
                typography.body,
              ]}
            >
              Review your shift details before finalizing
            </GeistText>
          </View>

          {/* Summary content */}
          <View
            style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
          >
            <View style={tw`flex-row items-center mb-3`}>
              <MaterialCommunityIcons
                name="chart-line"
                size={18}
                color="#10b981"
                style={tw`mr-2`}
              />
              <GeistText style={[tw`text-gray-900`, typography.h3]}>
                Sales
              </GeistText>
            </View>

            <View style={tw`border-b border-gray-100 mb-3`} />

            <View style={tw`flex-row justify-between items-center mb-2`}>
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Total Sales
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                {formatCurrency(summaryData.totalSales)}
              </GeistText>
            </View>

            <View style={tw`flex-row justify-between items-center mb-2`}>
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Cash Sales
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                {formatCurrency(summaryData.cashSales)}
              </GeistText>
            </View>

            <View style={tw`flex-row justify-between items-center`}>
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Total Transactions
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                {summaryData.transactionCount}
              </GeistText>
            </View>
          </View>

          {/* Summary content */}
          <View
            style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
          >
            <View style={tw`flex-row items-center mb-3`}>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={18}
                color="#10b981"
                style={tw`mr-2`}
              />
              <GeistText style={[tw`text-gray-900`, typography.h3]}>
                Cash
              </GeistText>
            </View>

            <View style={tw`bg-blue-50 rounded-lg p-2 mb-3`}>
              <GeistText
                style={[tw`text-blue-800 text-xs`, typography.caption]}
              >
                Compare what should be in your drawer vs. what you counted
              </GeistText>
            </View>

            <View style={tw`border-b border-gray-100 mb-3`} />

            <View style={tw`flex-row justify-between items-center mb-3`}>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                Expected Cash in Drawer
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                {formatCurrency(summaryData.expectedCash)}
              </GeistText>
            </View>

            <View style={tw`flex-row justify-between items-center mb-3`}>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                Actual Cash Counted
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                {formatCurrency(summaryData.endCash)}
              </GeistText>
            </View>

            <View style={tw`border-t border-gray-100 pt-3 opacity-0 h-0`}>
              <View style={tw`flex-row justify-between items-center`}>
                <GeistText
                  style={[tw`text-gray-900`, typography.h3]}
                ></GeistText>
                <GeistText
                  style={[
                    summaryData.cashDifference < 0
                      ? tw`text-red-600`
                      : summaryData.cashDifference > 0
                      ? tw`text-yellow-600`
                      : tw`text-green-600`,
                    typography.h3,
                  ]}
                >
                  {summaryData.cashDifference === 0
                    ? "Perfect Match"
                    : summaryData.cashDifference > 0
                    ? `+${formatCurrency(summaryData.cashDifference)} Over`
                    : `${formatCurrency(summaryData.cashDifference)} Short`}
                </GeistText>
              </View>
            </View>
          </View>

          <View
            style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
          >
            <View style={tw`flex-row items-center mb-3`}>
              <MaterialCommunityIcons
                name="comment-text-outline"
                size={18}
                color="#10b981"
                style={tw`mr-2`}
              />
              <GeistText style={[tw`text-gray-900`, typography.h3]}>
                Comments
              </GeistText>
            </View>

            <View style={tw`border-b border-gray-100 mb-3`} />

            <TextInput
              style={tw`border border-gray-200 rounded-lg p-3 min-h-[100px] text-gray-900`}
              placeholder="Add any comments about this shift..."
              value={comments}
              onChangeText={setComments}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={tw`mt-6 bg-red-500 py-3 px-5 rounded-lg items-center  mb-6`}
            onPress={handleFinalSubmit}
          >
            <GeistText style={[tw`text-white`, typography.bodyBold]}>
              Complete Shift
            </GeistText>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={["#ef4444", "#dc2626"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw`p-3 sm:p-5 md:p-6`}
      >
        <GeistText
          style={[
            tw`text-white ${isMobile ? "text-xl" : "text-2xl"}`,
            typography.h1,
          ]}
        >
          End Shift
        </GeistText>

        <View style={tw`mt-2 flex-row items-center`}>
          <MaterialCommunityIcons
            name="timer"
            size={18}
            color="rgba(255,255,255,0.9)"
            style={tw`mr-2`}
          />
          <GeistText style={[tw`text-white text-opacity-90`, typography.body]}>
            Started {formatDate(currentShift?.startTime)}
          </GeistText>
        </View>
      </LinearGradient>

      {/* Progress Steps */}
      <View
        style={tw`py-3 sm:py-4 px-3 sm:px-4 bg-white border-b border-gray-100`}
      >
        <View style={tw`flex-row`}>
          {["inventory", "cash", "payouts", "summary"].map((stepName, index) =>
            renderStepIndicator(stepName, index)
          )}
        </View>
      </View>

      {/* Step Content */}
      <View style={tw`flex-1`}>
        {step === "inventory" && (
          <EndInventoryStep
            onComplete={handleEndInventory}
            startInventory={currentShift.inventory}
          />
        )}

        {step === "cash" && <CashEntryStep onComplete={handleEndCash} />}

        {step === "payouts" && <PayoutsStep onComplete={handlePayouts} />}

        {step === "summary" && summaryData && (
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`p-3 sm:p-4 md:p-6`}
          >
            {/* Summary content */}
            <View
              style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
            >
              <View style={tw`flex-row items-center mb-3`}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={18}
                  color="#10b981"
                  style={tw`mr-2`}
                />
                <GeistText style={[tw`text-gray-900`, typography.h3]}>
                  Sales
                </GeistText>
              </View>

              <View style={tw`border-b border-gray-100 mb-3`} />

              <View style={tw`flex-row justify-between items-center mb-2`}>
                <GeistText style={[tw`text-gray-600`, typography.body]}>
                  Total Sales
                </GeistText>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  {formatCurrency(summaryData.totalSales)}
                </GeistText>
              </View>

              <View style={tw`flex-row justify-between items-center mb-2`}>
                <GeistText style={[tw`text-gray-600`, typography.body]}>
                  Cash Sales
                </GeistText>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  {formatCurrency(summaryData.cashSales)}
                </GeistText>
              </View>

              <View style={tw`flex-row justify-between items-center`}>
                <GeistText style={[tw`text-gray-600`, typography.body]}>
                  Total Transactions
                </GeistText>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  {summaryData.transactionCount}
                </GeistText>
              </View>
            </View>

            {/* Summary content */}
            <View
              style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
            >
              <View style={tw`flex-row items-center mb-3`}>
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={18}
                  color="#10b981"
                  style={tw`mr-2`}
                />
                <GeistText style={[tw`text-gray-900`, typography.h3]}>
                  Cash
                </GeistText>
              </View>

              <View style={tw`bg-blue-50 rounded-lg p-2 mb-3`}>
                <GeistText
                  style={[tw`text-blue-800 text-xs`, typography.caption]}
                >
                  Compare what should be in your drawer vs. what you counted
                </GeistText>
              </View>

              <View style={tw`border-b border-gray-100 mb-3`} />

              <View style={tw`flex-row justify-between items-center mb-3`}>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  Expected Cash in Drawer
                </GeistText>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  {formatCurrency(summaryData.expectedCash)}
                </GeistText>
              </View>

              <View style={tw`flex-row justify-between items-center mb-3`}>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  Actual Cash Counted
                </GeistText>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  {formatCurrency(summaryData.endCash)}
                </GeistText>
              </View>

              <View style={tw`border-t border-gray-100 pt-3 opacity-0 h-0`}>
                <View style={tw`flex-row justify-between items-center`}>
                  <GeistText
                    style={[tw`text-gray-900`, typography.h3]}
                  ></GeistText>
                  <GeistText
                    style={[
                      summaryData.cashDifference < 0
                        ? tw`text-red-600`
                        : summaryData.cashDifference > 0
                        ? tw`text-yellow-600`
                        : tw`text-green-600`,
                      typography.h3,
                    ]}
                  >
                    {summaryData.cashDifference === 0
                      ? "Perfect Match"
                      : summaryData.cashDifference > 0
                      ? `+${formatCurrency(summaryData.cashDifference)} Over`
                      : `${formatCurrency(summaryData.cashDifference)} Short`}
                  </GeistText>
                </View>
              </View>
            </View>

            <View
              style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
            >
              <View style={tw`flex-row items-center mb-3`}>
                <MaterialCommunityIcons
                  name="comment-text-outline"
                  size={18}
                  color="#10b981"
                  style={tw`mr-2`}
                />
                <GeistText style={[tw`text-gray-900`, typography.h3]}>
                  Comments
                </GeistText>
              </View>

              <View style={tw`border-b border-gray-100 mb-3`} />

              <TextInput
                style={tw`border border-gray-200 rounded-lg p-3 min-h-[100px] text-gray-900`}
                placeholder="Add any comments about this shift..."
                value={comments}
                onChangeText={setComments}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={tw`mt-6 bg-red-500 py-3 px-5 rounded-lg items-center  mb-6`}
              onPress={handleFinalSubmit}
            >
              <GeistText style={[tw`text-white`, typography.bodyBold]}>
                Complete Shift
              </GeistText>
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === "submitting" && (
          <View style={tw`flex-1 justify-center items-center p-4`}>
            <LinearGradient
              colors={["#f0f9ff", "#e0f2fe", "#bae6fd"]}
              style={tw`p-6 rounded-2xl items-center shadow-lg w-full max-w-md`}
            >
              <View style={tw`rounded-full bg-white p-4 mb-4 `}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: loadingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  }}
                >
                  <MaterialCommunityIcons
                    name="cash-register"
                    size={40}
                    color="#3b82f6"
                  />
                </Animated.View>
              </View>

              <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
                Ending Shift...
              </GeistText>

              <GeistText
                style={[
                  tw`text-gray-500 text-center mt-2 mb-6`,
                  typography.body,
                ]}
              >
                Please wait while we process your shift data
              </GeistText>

              {/* Progress bar with smoother animation */}
              <View
                style={tw`w-full h-2 bg-gray-200 rounded-full mb-6 overflow-hidden`}
              >
                <Animated.View
                  style={[
                    tw`h-2 bg-blue-500 rounded-full`,
                    {
                      width: progressValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>

              {/* Processing steps with improved animation */}
              <View style={tw`w-full`}>
                {processingSteps.map((step, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      tw`flex-row items-center mb-3`,
                      {
                        opacity: index > processingStep ? 0.4 : 1,
                      },
                    ]}
                  >
                    <View
                      style={tw`w-6 h-6 rounded-full ${
                        index < processingStep
                          ? "bg-green-500"
                          : index === processingStep
                          ? "bg-blue-500"
                          : "bg-gray-300"
                      } items-center justify-center mr-3`}
                    >
                      {index < processingStep ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color="white"
                        />
                      ) : (
                        <GeistText style={tw`text-white text-xs`}>
                          {index + 1}
                        </GeistText>
                      )}
                    </View>
                    <GeistText
                      style={[
                        tw`${
                          index < processingStep
                            ? "text-gray-500"
                            : index === processingStep
                            ? "text-gray-900"
                            : "text-gray-400"
                        }`,
                        index === processingStep
                          ? typography.bodyBold
                          : typography.body,
                      ]}
                    >
                      {step}
                    </GeistText>
                  </Animated.View>
                ))}
              </View>
            </LinearGradient>
          </View>
        )}
      </View>
    </View>
  );
}
