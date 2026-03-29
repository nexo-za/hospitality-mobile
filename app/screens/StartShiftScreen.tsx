import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  memo,
  useCallback,
} from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
  Animated,
  Easing,
  Text,
  FlatList,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift, InventoryItem } from "../contexts/ShiftContext";
import { ShiftAPI } from "@/api/services";
import authService from "@/api/services/authService";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";

// Extend inventory item with the fields we need for the inventory count step
interface ExtendedInventoryItem extends InventoryItem {
  original_qty: number;
  count: number;
  has_discrepancy: boolean;
  sku?: string;
  variant?: string;
}

const PinKeypad = ({
  pin,
  setPin,
  onComplete,
  onError,
  loading,
  error,
}: {
  pin: string;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  onComplete: (pin: string) => void;
  onError: (error: string) => void;
  loading: boolean;
  error: string | null;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 360;

  // Animation values for the pin dots
  const dotAnimations = [
    React.useRef(new Animated.Value(0)).current,
    React.useRef(new Animated.Value(0)).current,
    React.useRef(new Animated.Value(0)).current,
    React.useRef(new Animated.Value(0)).current,
    React.useRef(new Animated.Value(0)).current,
    React.useRef(new Animated.Value(0)).current,
  ];

  // Loading spinner animation
  const spinAnimation = React.useRef(new Animated.Value(0)).current;

  // Error shake animation
  const shakeAnimation = React.useRef(new Animated.Value(0)).current;

  // Button press animation
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  useEffect(() => {
    // Animate the pin dots when pin changes
    if (pin.length > 0) {
      Animated.spring(dotAnimations[pin.length - 1], {
        toValue: 1,
        useNativeDriver: false,
        friction: 4,
      }).start();
    }

    // Create the spinner animation when loading
    if (loading) {
      Animated.loop(
        Animated.timing(spinAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    } else {
      spinAnimation.setValue(0);
    }

    // Create shake animation when there's an error
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
      ]).start();
    }
  }, [pin, loading, error]);

  const handleKeyPress = (key: string) => {
    // Set pressed key for animation
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 150);

    if (key === "delete") {
      if (pin.length > 0) {
        // Reset animation for the removed dot
        Animated.timing(dotAnimations[pin.length - 1], {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }).start();

        setPin((prev: string) => prev.slice(0, -1));
      }
      return;
    }

    if (pin.length < 6) {
      setPin((prev: string) => prev + key);
    }

    // If pin is now 6 digits, call onComplete
    if (pin.length === 5 && key !== "delete") {
      const newPin = pin + key;
      // Small timeout to show the last dot
      setTimeout(() => {
        onComplete(newPin);
      }, 300);
    }
  };

  const renderKey = (key: string, index: number) => {
    const isEmpty = key === "";
    const isDelete = key === "delete";
    const isPressed = pressedKey === key;

    return (
      <TouchableOpacity
        key={index}
        style={[
          isSmallMobile
            ? tw`w-16 h-16`
            : isMobile
            ? tw`w-20 h-10`
            : tw`w-32 h-16`,
          tw`rounded-full justify-center items-center`,
          isEmpty ? tw`bg-transparent` : {},
          !isEmpty && {
            backgroundColor: isPressed ? "#e6f2ff" : "white",
            borderWidth: 1,
            borderColor: isPressed ? "#3b82f6" : "#e5e7eb",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: isPressed ? 1 : 2 },
            shadowOpacity: isPressed ? 0.1 : 0.05,
            shadowRadius: isPressed ? 2 : 3,
            elevation: isPressed ? 1 : 2,
          },
        ]}
        onPress={() => key && handleKeyPress(key)}
        disabled={!key || loading || isEmpty}
        activeOpacity={0.7}
      >
        {isDelete ? (
          <MaterialCommunityIcons
            name="backspace-outline"
            size={isSmallMobile ? 22 : 26}
            color={isPressed ? "#3b82f6" : "#6b7280"}
          />
        ) : key ? (
          <GeistText
            style={[
              isSmallMobile ? tw`text-xl` : tw`text-2xl`,
              isPressed ? tw`text-blue-500` : tw`text-gray-900`,
              typography.h2,
            ]}
          >
            {key}
          </GeistText>
        ) : null}
      </TouchableOpacity>
    );
  };

  // Create a spin interpolation for the loading spinner
  const spin = spinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={tw`mt-4 md:mt-6`}>
      {/* PIN display */}
      <Animated.View
        style={[
          tw`flex-row justify-center mb-3 md:mb-4`,
          {
            transform: [{ translateX: shakeAnimation }],
          },
        ]}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const dotScale = dotAnimations[i].interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 1.4, 1],
          });

          const dotColor = dotAnimations[i].interpolate({
            inputRange: [0, 1],
            outputRange: [
              error ? "#fecaca" : "#e5e7eb",
              error ? "#ef4444" : "#3b82f6",
            ],
          });

          return (
            <Animated.View
              key={i}
              style={[
                tw`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full mx-1.5 sm:mx-2`,
                {
                  backgroundColor:
                    i < pin.length ? dotColor : error ? "#fecaca" : "#e5e7eb",
                  transform: [{ scale: i < pin.length ? dotScale : 1 }],
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: i < pin.length ? 0.2 : 0,
                  shadowRadius: 2,
                  elevation: i < pin.length ? 2 : 0,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {error && (
        <View style={tw`mb-4 items-center px-4`}>
          <View
            style={tw`bg-red-50 rounded-lg border border-red-100 p-3 w-full max-w-md`}
          >
            <View style={tw`flex-row items-center mb-1`}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color="#ef4444"
                style={tw`mr-2`}
              />
              <GeistText style={[tw`text-red-600`, typography.bodyBold]}>
                Error
              </GeistText>
            </View>
            <GeistText style={[tw`text-red-600`, typography.body]}>
              {error}
            </GeistText>
          </View>
        </View>
      )}

      {/* Keypad */}
      <View
        style={[
          isMobile
            ? tw`w-full`
            : tw`max-w-xs mx-auto flex items-center justify-center`,
          tw`mx-auto px-8 sm:px-0`,
        ]}
      >
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
          ["", "0", "delete"],
        ].map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={tw`flex-row justify-around my-1.5 sm:my-1.5`}
          >
            {row.map((key, i) => renderKey(key, i))}
          </View>
        ))}
      </View>

      {loading && (
        <View style={tw`mt-6 items-center`}>
          <View
            style={tw`flex-row items-center bg-blue-50 px-4 py-2 rounded-full`}
          >
            <Animated.View
              style={[
                tw`h-4 w-4 mr-2`,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: "#3b82f6",
                  borderTopColor: "transparent",
                }}
              />
            </Animated.View>
            <GeistText style={[tw`text-blue-700`, typography.captionSemibold]}>
              Verifying PIN...
            </GeistText>
          </View>
        </View>
      )}
    </View>
  );
};

const CashEntryStep = ({
  onComplete,
  expectedAmount,
}: {
  onComplete: (amount: number) => void;
  expectedAmount?: number | null;
}) => {
  const [amount, setAmount] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 360;

  const handleSubmit = () => {
    if (!amount) {
      // Zero is acceptable, but empty input is not
      onComplete(0);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount < 0) {
      Alert.alert("Invalid Amount", "Cash amount cannot be negative");
      return;
    }
    onComplete(parsedAmount);
  };

  // Define the quick amounts with appropriate formatting
  const baseQuickAmounts = [
    { value: 0, label: "No Cash", className: "w-[22%]" },
    { value: 100, label: "R100", className: "w-[18%]" },
    { value: 200, label: "R200", className: "w-[18%]" },
    { value: 500, label: "R500", className: "w-[18%]" },
    { value: 1000, label: "R1000", className: "w-[18%]" },
  ];

  // Add expected amount if available
  const quickAmounts = expectedAmount ? [
    { value: expectedAmount, label: `R${expectedAmount.toFixed(2)} (Expected)`, className: "w-full mb-2", isExpected: true },
    ...baseQuickAmounts
  ] : baseQuickAmounts;

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
            Enter Starting Cash
          </GeistText>
          <GeistText
            style={[
              tw`text-gray-500 text-center mt-2 max-w-sm`,
              typography.body,
            ]}
          >
            Count all the cash in your register or enter 0 if starting without
            cash
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
              Starting Cash Amount
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

          {/* Expected amount banner */}
          {expectedAmount && (
            <View style={tw`bg-green-50 border border-green-200 rounded-lg p-3 mb-3`}>
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons name="information" size={16} color="#10b981" style={tw`mr-2`} />
                <GeistText style={[tw`text-green-800 flex-1`, typography.bodySemibold]}>
                  Expected starting cash from previous shift: R{expectedAmount.toFixed(2)}
                </GeistText>
              </View>
            </View>
          )}

          {/* Quick amount buttons - updated layout */}
          <View style={tw`flex-row flex-wrap justify-between mb-2`}>
            {quickAmounts.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={tw`mb-2 ${
                  item.className || (isSmallMobile ? "w-[30%]" : "w-[18%]")
                }`}
                onPress={() =>
                  setAmount(item.value === 0 ? "0" : item.value.toString())
                }
              >
                <View
                  style={tw`${
                    (item as any).isExpected
                      ? "bg-green-50 border-green-200"
                      : item.value === 0
                      ? "bg-gray-50 border-gray-100"
                      : "bg-blue-50 border-blue-100"
                  } border rounded-lg py-2 px-1 flex items-center justify-center ${(item as any).isExpected ? "h-16" : "h-12"}`}
                >
                  <GeistText
                    style={[
                      tw`${
                        (item as any).isExpected
                          ? "text-green-800"
                          : item.value === 0 ? "text-gray-700" : "text-blue-700"
                      } text-center ${item.value === 0 ? "text-xs" : ""} ${(item as any).isExpected ? "text-sm" : ""}`,
                      (item as any).isExpected ? typography.bodySemibold : typography.captionSemibold,
                    ]}
                    numberOfLines={(item as any).isExpected ? 2 : 1}
                    ellipsizeMode="tail"
                  >
                    {item.label}
                  </GeistText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View
          style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
        >
          <GeistText style={[tw`text-gray-900 mb-3`, typography.bodyBold]}>
            Cash Counting Tips
          </GeistText>
          <View style={tw`space-y-2`}>
            <View style={tw`flex-row items-start`}>
              <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2 mt-1.5`} />
              <GeistText style={[tw`text-gray-600 flex-1`, typography.body]}>
                Count each denomination separately
              </GeistText>
            </View>
            <View style={tw`flex-row items-start`}>
              <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2 mt-1.5`} />
              <GeistText style={[tw`text-gray-600 flex-1`, typography.body]}>
                Double-check your count before proceeding
              </GeistText>
            </View>
            <View style={tw`flex-row items-start`}>
              <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2 mt-1.5`} />
              <GeistText style={[tw`text-gray-600 flex-1`, typography.body]}>
                Verify all cash is placed in the till
              </GeistText>
            </View>
          </View>
        </View>

        <View
          style={tw`bg-blue-50 rounded-xl p-4 sm:p-5 border border-blue-100 mb-4`}
        >
          <View style={tw`flex-row items-center mb-2`}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color="#3b82f6"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-blue-800`, typography.bodyBold]}>
              Important
            </GeistText>
          </View>
          <GeistText style={[tw`text-blue-800`, typography.body]}>
            This amount will be used as your starting float for this shift. Make
            sure it matches the physical cash in your drawer, or leave as 0 if
            no cash is present.
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

// Memoized Product Item Component
const ProductItem = memo(
  ({
    item,
    onCountChange,
    onNoteChange,
    note,
  }: {
    item: ExtendedInventoryItem;
    onCountChange: (productId: string, value: string) => void;
    onNoteChange: (productId: string, note: string) => void;
    note: string;
  }) => {
    const hasDiscrepancy = item.has_discrepancy;

    return (
      <View style={tw`mb-4`}>
        <View style={tw`flex-row items-center py-2`}>
          {/* Product name */}
          <View style={tw`w-3/4 pr-2`}>
            <GeistText
              style={[tw`text-gray-800`, typography.body]}
              numberOfLines={2}
            >
              {item.productName}
            </GeistText>
            {/* Display SKU and Variant information */}
            <View style={tw`flex-row flex-wrap mt-1`}>
              {item.sku && (
                <GeistText style={[tw`text-gray-500 mr-3`, typography.caption]}>
                  SKU: {item.sku}
                </GeistText>
              )}
              {item.variant && item.variant !== item.productName && (
                <GeistText style={[tw`text-gray-500`, typography.caption]}>
                  Variant: {item.variant}
                </GeistText>
              )}
            </View>
          </View>

          {/* Physical count input */}
          <View style={tw`w-1/4 items-center`}>
            <TextInput
              keyboardType="numeric"
              style={[
                tw`border border-gray-300 rounded-lg py-1 px-2 w-20 text-center`,
                typography.body,
              ]}
              value={item.count?.toString()}
              onChangeText={(value) => onCountChange(item.productId, value)}
            />
          </View>
        </View>

        <View style={tw`border-b border-gray-100 my-1`} />
      </View>
    );
  }
);

// Memoized Category Button Component
const CategoryButton = memo(
  ({
    category,
    isSelected,
    onPress,
  }: {
    category: string;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        tw`rounded-full px-4 py-2 mr-2`,
        isSelected ? tw`bg-blue-500` : tw`bg-gray-100`,
      ]}
    >
      <GeistText
        style={[
          isSelected ? tw`text-white` : tw`text-gray-700`,
          typography.captionSemibold,
        ]}
      >
        {category === "all" ? "All" : category}
      </GeistText>
    </TouchableOpacity>
  )
);

const InventoryCountStep = ({
  onComplete,
}: {
  onComplete: (inventory: InventoryItem[]) => void;
}) => {
  const [inventory, setInventory] = useState<ExtendedInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [apiProducts, setApiProducts] = useState<ExtendedInventoryItem[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { user } = useAuth();

  // Pagination and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        // Create empty inventory as a default
        const emptyInventory: ExtendedInventoryItem[] = [];
        
        // First try new API inventory endpoint
        try {
          const userId = user?.id;
          
 
          const response = await ShiftAPI.getStoreInventory({ 
            no_pagination: true,
            user_id: userId ? Number(userId) : undefined,
          });

          
          if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
            
            // Map API response to inventory items
            const fromApi: ExtendedInventoryItem[] = response.data.map((p) => {
              const qtyOnHand = p.onhand_qty || p.qty_on_hand || 0; // Use onhand_qty first, then fallback to qty_on_hand

              
              return {
                productId: String(p.product_id),
                productName: p.name && p.variant ? `${p.name} - ${p.variant}` : p.name || p.item_name,
                category: p.category || "",
                expectedCount: qtyOnHand,
                actualCount: qtyOnHand, // Set actual count to the API quantity as default
                discrepancy: 0,
                product_id: Number(p.product_id) || 0,
                item_name: p.name || p.item_name,
                qty_on_hand: qtyOnHand,
                original_qty: qtyOnHand,
                count: qtyOnHand, // Set count to the API quantity as default
                has_discrepancy: false,
                sku: p.sku,
                variant: p.variant,
              };
            });

            setApiProducts(fromApi);

            // Build categories from API data
            const categoriesSet = new Set(fromApi.map((i) => i.category).filter(Boolean));
            setCategories([...Array.from(categoriesSet)] as string[]);
            setSelectedCategory(null);
            setInventory(fromApi);
          } else {
            throw new Error("Empty API inventory");
          }
        } catch (apiErr) {
          console.warn("Failed to load inventory from API:", apiErr);
          setCategories([]);
          setSelectedCategory(null);
          setInventory(emptyInventory);
        }
      } catch (err: any) {
        console.error("Error loading products:", err);
        setError(err.message || "Failed to load inventory data");
        setCategories([]);
        setSelectedCategory(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [user]);

  // Reset to first page when changing category or search query
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Get filtered products based on category and search query
  const filteredProducts = useMemo(() => {
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
      filtered = filtered.filter(
        (item) =>
          item.productName.toLowerCase().includes(query) ||
          (item.sku && item.sku.toLowerCase().includes(query))
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
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleCountChange = (productId: string, value: string) => {
    const numValue = parseInt(value || "0", 10);

    setInventory((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const updatedItem = {
            ...item,
            count: numValue,
            actualCount: numValue,
            discrepancy: numValue - item.expectedCount,
            has_discrepancy: false, // No longer showing discrepancies
          };

          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleNoteChange = (productId: string, note: string) => {
    setNotes((prev) => ({
      ...prev,
      [productId]: note,
    }));
  };

  const handleSubmit = useCallback(() => {
    // Add notes to inventory items and convert to the format expected by ShiftContext
    const inventoryWithNotes = inventory.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      expectedCount: item.expectedCount,
      actualCount: item.actualCount,
      discrepancy: item.discrepancy,
      category: item.category,
      comment: notes[item.productId] || "",
      product_id: item.product_id,
      item_name: item.item_name,
      qty_on_hand: item.qty_on_hand,
      sku: item.sku,
      variant: item.variant,
    }));

    onComplete(inventoryWithNotes);
  }, [inventory, notes, onComplete]);

  const handleSearchClear = () => {
    setSearchQuery("");
  };

  return (
    <View style={tw`flex-1 flex-col`}>
      <ScrollView style={tw`flex-1`}>
        <View style={tw`items-center mb-4 sm:mb-6 md:mb-8 p-3 sm:p-4 md:p-6`}>
          <View
            style={tw`w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4`}
          >
            <MaterialCommunityIcons
              name="clipboard-list"
              size={36}
              color="#3b82f6"
            />
          </View>
          <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
            Inventory Count
          </GeistText>
          <GeistText
            style={[
              tw`text-gray-500 text-center mt-2 max-w-sm`,
              typography.body,
            ]}
          >
            Count each product carefully and enter the actual quantity on hand
          </GeistText>
        </View>

        {isLoading ? (
          <View style={tw`items-center justify-center py-8`}>
            <View
              style={tw`flex-row items-center bg-blue-50 px-4 py-2 rounded-full`}
            >
              <View
                style={[
                  tw`h-4 w-4 mr-2 border-2 border-blue-500 border-t-transparent rounded-full`,
                  { transform: [{ rotate: "45deg" }] },
                ]}
              />
              <GeistText
                style={[tw`text-blue-700`, typography.captionSemibold]}
              >
                Loading inventory...
              </GeistText>
            </View>
          </View>
        ) : (
          <>
            {/* Search Bar */}
            <View
              style={tw`bg-white rounded-xl p-4 border border-gray-100 mb-4 mx-3 sm:mx-4 md:mx-6`}
            >
              <View style={tw`relative`}>
                <TextInput
                  style={[
                    tw`border border-gray-200 rounded-lg py-2 px-10 bg-white`,
                    typography.body,
                  ]}
                  placeholder="Search by product name or SKU..."
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
            </View>

            {/* Categories */}
            <View
              style={tw`bg-white rounded-xl p-4 border border-gray-100 mb-4 mx-3 sm:mx-4 md:mx-6`}
            >
              <GeistText style={[tw`text-gray-700 mb-3`, typography.bodyBold]}>
                Product Categories
              </GeistText>

              {categories.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={tw`flex-row gap-2`}>
                    <TouchableOpacity
                      key="all-categories"
                      onPress={() => setSelectedCategory(null)}
                      style={[
                        tw`rounded-full px-4 py-2 mr-2`,
                        selectedCategory === null
                          ? tw`bg-blue-500`
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
                            ? tw`bg-blue-500`
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
              ) : (
                <View style={tw`bg-gray-50 rounded-lg p-4 items-center`}>
                  <GeistText style={[tw`text-gray-500`, typography.body]}>
                    No product categories found
                  </GeistText>
                </View>
              )}
            </View>

            {/* Products with Pagination */}
            <View
              style={tw`bg-white rounded-xl p-4 border border-gray-100 mb-4 mx-3 sm:mx-4 md:mx-6`}
            >
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <GeistText style={[tw`text-gray-700`, typography.bodyBold]}>
                  {selectedCategory
                    ? `${selectedCategory} Products`
                    : searchQuery
                    ? "Search Results"
                    : "All Products"}
                </GeistText>

                <GeistText style={[tw`text-gray-500`, typography.caption]}>
                  {filteredProducts.length} product(s) • Page {currentPage} of{" "}
                  {totalPages || 1}
                </GeistText>
              </View>

              {filteredProducts.length > 0 ? (
                <View>
                  {/* Table header */}
                  <View
                    style={tw`flex-row items-center py-2 border-b border-gray-200 mb-2`}
                  >
                    <GeistText
                      style={[
                        tw`w-3/4 font-bold text-gray-700`,
                        typography.captionSemibold,
                      ]}
                    >
                      Product
                    </GeistText>
                    <GeistText
                      style={[
                        tw`w-1/4 text-center font-bold text-gray-700`,
                        typography.captionSemibold,
                      ]}
                    >
                      Count
                    </GeistText>
                  </View>

                  {/* Product list - now showing paginated results */}
                  {paginatedProducts.map((item) => {
                    const productId = item.productId;
                    const hasDiscrepancy = item.has_discrepancy;

                    return (
                      <View key={productId.toString()} style={tw`mb-4`}>
                        <View style={tw`flex-row items-center py-2`}>
                          {/* Product name */}
                          <View style={tw`w-3/4 pr-2`}>
                            <GeistText
                              style={[tw`text-gray-800`, typography.body]}
                              numberOfLines={2}
                            >
                              {item.productName}
                            </GeistText>
                            {/* Display SKU and Variant information */}
                            <View style={tw`flex-row flex-wrap mt-1`}>
                              {item.sku && (
                                <GeistText
                                  style={[
                                    tw`text-gray-500 mr-3`,
                                    typography.caption,
                                  ]}
                                >
                                  SKU: {item.sku}
                                </GeistText>
                              )}
                              {item.variant &&
                                item.variant !== item.productName && (
                                  <GeistText
                                    style={[
                                      tw`text-gray-500`,
                                      typography.caption,
                                    ]}
                                  >
                                    Variant: {item.variant}
                                  </GeistText>
                                )}
                            </View>
                          </View>

                          {/* Physical count input */}
                          <View style={tw`w-1/4 items-center`}>
                            <TextInput
                              keyboardType="numeric"
                              style={[
                                tw`border border-gray-300 rounded-lg py-1 px-2 w-20 text-center`,
                                typography.body,
                              ]}
                              value={String(item.count || item.actualCount || item.qty_on_hand || 0)}
                              onChangeText={(value) =>
                                handleCountChange(productId, value)
                              }
                            />
                          </View>
                        </View>

                        <View style={tw`border-b border-gray-100 my-1`} />
                      </View>
                    );
                  })}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <View
                      style={tw`flex-row justify-between items-center mt-4 pt-2 border-t border-gray-100`}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
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
                        <GeistText
                          style={[tw`text-gray-700`, typography.caption]}
                        >
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
                                    ? tw`bg-blue-500`
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
                                style={[
                                  tw`mx-1 text-gray-400`,
                                  typography.caption,
                                ]}
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
                              if (pageNum < 1 || pageNum > totalPages)
                                return null;

                              return (
                                <TouchableOpacity
                                  key={pageNum}
                                  onPress={() => setCurrentPage(pageNum)}
                                  style={[
                                    tw`w-8 h-8 rounded-full justify-center items-center mx-0.5`,
                                    currentPage === pageNum
                                      ? tw`bg-blue-500`
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
                                style={[
                                  tw`mx-1 text-gray-400`,
                                  typography.caption,
                                ]}
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
                                    ? tw`bg-blue-500`
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
                                  ? tw`bg-blue-500`
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
                        <GeistText
                          style={[tw`text-gray-700`, typography.caption]}
                        >
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
                    <GeistText
                      style={[tw`text-gray-500 mr-2`, typography.caption]}
                    >
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
                            itemsPerPage === value ? tw`bg-blue-500` : {},
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
          </>
        )}

        {error && (
          <View
            style={tw`bg-red-50 rounded-xl p-4 border border-red-100 mb-4 mx-3 sm:mx-4 md:mx-6`}
          >
            <View style={tw`flex-row items-center mb-2`}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color="#ef4444"
                style={tw`mr-2`}
              />
              <GeistText style={[tw`text-red-700`, typography.bodyBold]}>
                Error Loading Inventory
              </GeistText>
            </View>
            <GeistText style={[tw`text-red-700`, typography.body]}>
              {error}
            </GeistText>
          </View>
        )}
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

const NotesStep = ({ onComplete }: { onComplete: (notes: string) => void }) => {
  const [notes, setNotes] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 360;
  const { currentShift } = useShift();
  const startCash = currentShift?.startCash || 0;

  const handleSubmit = () => {
    onComplete(notes);
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === undefined || amount === null) {
      return "R0.00";
    }
    return "R" + amount.toFixed(2);
  };

  return (
    <View style={tw`flex-1 flex-col`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-3 sm:p-4 md:p-6`}
      >
        <View style={tw`items-center mb-4 sm:mb-6 md:mb-8`}>
          <View
            style={tw`w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4`}
          >
            <MaterialCommunityIcons
              name="note-text-outline"
              size={36}
              color="#10b981"
            />
          </View>
          <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
            Shift Notes
          </GeistText>
          <GeistText
            style={[
              tw`text-gray-500 text-center mt-2 max-w-sm`,
              typography.body,
            ]}
          >
            Add any important information about this shift
          </GeistText>
        </View>

        <View
          style={tw`bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-gray-100  mb-4`}
        >
          <View style={tw`flex-row items-center mb-3`}>
            <MaterialCommunityIcons
              name="comment-text-outline"
              size={18}
              color="#10b981"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-800`, typography.bodyBold]}>
              Notes
            </GeistText>
          </View>

          <TextInput
            style={[
              tw`border rounded-xl p-3 text-gray-900 min-h-[160px] border-gray-200 bg-white`,
              typography.body,
            ]}
            multiline
            placeholder="Enter any important notes about the shift... (optional)"
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>

        <View
          style={tw`bg-white rounded-xl p-4 sm:p-5 border border-gray-100  mb-4`}
        >
          <View style={tw`flex-row items-center mb-3`}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={18}
              color="#f59e0b"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-800`, typography.bodyBold]}>
              Note Examples
            </GeistText>
          </View>
          <View style={tw`space-y-2`}>
            <View style={tw`flex-row items-start`}>
              <View
                style={tw`w-2 h-2 rounded-full bg-yellow-500 mr-2 mt-1.5`}
              />
              <GeistText style={[tw`text-gray-600 flex-1`, typography.body]}>
                Special promotions or sales
              </GeistText>
            </View>
            <View style={tw`flex-row items-start`}>
              <View
                style={tw`w-2 h-2 rounded-full bg-yellow-500 mr-2 mt-1.5`}
              />
              <GeistText style={[tw`text-gray-600 flex-1`, typography.body]}>
                Inventory or supply issues
              </GeistText>
            </View>
            <View style={tw`flex-row items-start`}>
              <View
                style={tw`w-2 h-2 rounded-full bg-yellow-500 mr-2 mt-1.5`}
              />
              <GeistText style={[tw`text-gray-600 flex-1`, typography.body]}>
                Staffing information
              </GeistText>
            </View>
            <View style={tw`flex-row items-start`}>
              <View
                style={tw`w-2 h-2 rounded-full bg-yellow-500 mr-2 mt-1.5`}
              />
              <GeistText style={[tw`text-gray-600 flex-1`, typography.body]}>
                Equipment or technical issues
              </GeistText>
            </View>
          </View>
        </View>

        <View
          style={tw`bg-green-50 rounded-xl p-4 sm:p-5 border border-green-100 mb-4`}
        >
          <View style={tw`flex-row items-center mb-2`}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={18}
              color="#10b981"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-green-800`, typography.bodyBold]}>
              Ready to Start Shift
            </GeistText>
          </View>
          <GeistText style={[tw`text-green-700`, typography.body]}>
            After pressing "Start Shift", your cash drawer will be initialized
            with {formatCurrency(startCash)} and you'll be ready to begin making
            sales.
          </GeistText>
        </View>
      </ScrollView>

      <View
        style={tw`px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white`}
      >
        <TouchableOpacity
          style={tw`bg-green-500 rounded-xl py-3 sm:py-4 px-4 sm:px-6 flex-row justify-center items-center`}
          onPress={handleSubmit}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color="white"
            style={tw`mr-2`}
          />
          <GeistText style={[tw`text-white`, typography.bodyBold]}>
            Start Shift
          </GeistText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function StartShiftScreen() {
  const [step, setStep] = useState<
    "pin" | "cash" | "inventory" | "notes" | "loading"
  >("pin");
  const [pin, setPin] = useState("");
  const [cash, setCash] = useState(0);
  const [notes, setNotes] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedStartingCash, setExpectedStartingCash] = useState<number | null>(null);
  const { startShift, currentShift } = useShift();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const userId = params.userId
    ? Number(params.userId)
    : user?.id
    ? Number(user.id)
    : 0;
  const storeId = params.storeId
    ? Number(params.storeId)
    : user?.store_id
    ? Number(user.store_id)
    : 0;
  const userDataString = params.userData as string;
  const userData = userDataString ? JSON.parse(userDataString) : user || null;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [canStart, setCanStart] = useState<boolean | null>(null);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);

  // Animation for loading indicator
  const loadingAnimation = React.useRef(new Animated.Value(0)).current;
  const progressValue = React.useRef(new Animated.Value(0)).current;
  const [processingStep, setProcessingStep] = useState(0);
  const processingSteps = [
    "Validating credentials",
    "Preparing cash drawer",
    "Setting up inventory",
    "Initializing shift",
    "Configuring system",
  ];

  React.useEffect(() => {
    if (step === "loading") {
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
    } else {
      // Reset animation when not loading
      loadingAnimation.setValue(0);
      progressValue.setValue(0);
      setProcessingStep(0);
    }
  }, [step]);

  // Eligibility check: use active_shift and can_start_shift
  useEffect(() => {
    const checkEligibility = async () => {
      try {
        // First: if user already has an active shift, navigate them to sales
        const active = await ShiftAPI.getActiveShift({ user_id: Number(userId || 0) });
        if (active?.has_active_shift && active.active_shift) {
          console.log(
            `Active shift detected (id=${active.active_shift.shift_id}), redirecting to sales`
          );
          Alert.alert(
            "Active Shift",
            `You already have an active shift (#${active.active_shift.shift_id}). Going to Sales.`,
            [
              {
                text: "OK",
                onPress: () => navigateToSales(),
              },
            ],
            { cancelable: false }
          );
          return;
        }

        // Then: check if user can start a shift and capture reason if not
        const canStartResp = await ShiftAPI.canStartShift({ user_id: Number(userId || 0) });
        setCanStart(Boolean(canStartResp?.can_start));
        if (!canStartResp?.can_start) {
          const reason = canStartResp?.reason || "Cannot start shift right now.";
          setEligibilityReason(reason);
          setError(reason);
          console.warn(`[StartShift] Start blocked by server: ${reason}`);
        } else {
          setEligibilityReason(null);
        }
      } catch (e: any) {
        console.warn("Eligibility check failed:", e?.message || e);
      }
    };

    checkEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinComplete = async (pin: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Verifying PIN for userId: ${userId}`);
      console.log(
        `userId source: ${
          params.userId ? "URL params" : user?.id ? "User context" : "Default 0"
        }`
      );

      const userIdNum = userId ? Number(userId) : 0;

      // Add validation to prevent sending requests with user ID 0
      if (!userIdNum) {
        setError("Invalid user ID. Please log in again.");
        return;
      }

      // Block PIN flow if eligibility says cannot start
      if (canStart === false) {
        throw new Error(
          eligibilityReason || "You cannot start a shift at this time."
        );
      }

      const verified = await authService.verifyPin(userIdNum, pin);

      if (verified) {
        setStep("cash");
      } else {
        throw new Error("Invalid PIN. Please try again.");
      }
    } catch (error: any) {
      // Prefer API-provided message if available
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.data?.message ||
        error?.message ||
        "An unknown error occurred";

      const userFriendlyError = getUserFriendlyErrorMessage(apiMessage);

      setError(userFriendlyError);
      setPin("");

      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const getUserFriendlyErrorMessage = (errorMessage: string): string => {
    if (!errorMessage) return "An unknown error occurred";

    if (errorMessage.includes("User not found")) {
      return "User not found. Please check your credentials or contact support.";
    }

    if (
      errorMessage.includes("incorrect PIN")
    ) {
      return "Incorrect PIN. Please try again.";
    }

    // If API sent a direct, clear message (e.g., "Invalid PIN"), surface it as-is
    if (errorMessage.includes("Invalid PIN")) {
      return errorMessage;
    }

    if (errorMessage.includes("Request failed with status code")) {
      return "Connection error. Please check your internet connection and try again.";
    }

    if (errorMessage.includes("Network Error")) {
      return "Network error. Please check your internet connection and try again.";
    }

    return errorMessage;
  };

  const handleCashComplete = (amount: number) => {
    setCash(amount);
    setStep("inventory");
  };

  const handleInventoryComplete = async (inventory: InventoryItem[]) => {
    setInventory(inventory);
    setStep("notes");
  };

  const handleNotesComplete = async (notes: string) => {
    setNotes(notes);
    setLoading(true);
    setError(null);
    setStep("loading");

    try {
      // Get proper staff ID from user data
      const staffId = userData?.staff_id || user?.staffId || "STAFF_" + userId;

      // Log the staff ID source for debugging
      console.log(
        `Using staff ID: ${staffId || "undefined"} from source: ${
          userData?.staff_id
            ? "userData"
            : user?.staffId
            ? "user.staffId"
            : "user ID fallback"
        }`
      );

      // Validate that we have a staffId before proceeding
      if (!staffId) {
        console.warn("No staff ID found in user data - this may cause issues");
      }

      // Get the current timestamp for the shift start time
      const timestamp = Date.now();
      const dateTime = new Date().toISOString();

      console.log("Starting shift creation flow...");

      // Optional pre-check: ensure user can start a shift
      try {
        const canStart = await ShiftAPI.canStartShift({ user_id: Number(userId) });
        if (!canStart.can_start) {
          throw new Error(
            canStart.reason || "User cannot start a new shift at this time"
          );
        }
      } catch (precheckError: any) {
        throw new Error(precheckError?.message || "Cannot start shift");
      }

      // Step 1: Create shift in the backend
      const startShiftResponse = await ShiftAPI.openShift({
        user_id: userId !== undefined && userId !== null ? Number(userId) : 1,
        staff_id: staffId,
        date_time: dateTime,
        starting_cash:
          typeof cash === "number" ? cash : parseInt(String(cash), 10) || 0,
        comments: notes || "",
      });

      console.log(
        "Backend shift response:",
        JSON.stringify(startShiftResponse)
      );

      // Check if API response is successful based on its actual structure
      if (!startShiftResponse || startShiftResponse.status !== "success") {
        console.error("Shift creation failed with response:", startShiftResponse);
        throw new Error(
          "Failed to start shift: " +
            ((startShiftResponse as any)?.message ||
              (startShiftResponse as any)?.data?.message ||
              "Unknown error")
        );
      }

      console.log("Backend shift creation successful!");

      // Extract shift ID from the actual response structure
      const backendShiftId = startShiftResponse?.data?.shift_id;
      console.log(`Obtained backend shift ID: ${backendShiftId}`);

      if (!backendShiftId) {
        console.error(
          "Backend did not provide a shift ID in response:",
          startShiftResponse
        );
        throw new Error("Could not get shift ID from the server response");
      }

      // Step 2: Record opening inventory changes only (optional)
      console.log("Preparing inventory changes for shift ID:", backendShiftId);

      try {
        const userIdNumeric = Number(userId || user?.id || 0) || 1;

        // Log the inventory state before processing
        console.log("[InventorySubmission] Processing inventory items:", {
          totalItems: inventory?.length || 0,
          firstFewItems: inventory?.slice(0, 3).map(item => ({
            productId: item.productId,
            product_id: item.product_id,
            expectedCount: item.expectedCount,
            actualCount: item.actualCount,
            count: (item as any).count,
            qty_on_hand: item.qty_on_hand,
          }))
        });

        const changedItems = (inventory || [])
          .filter((item) => {
            const expected = Number(item.expectedCount ?? item.qty_on_hand ?? 0);
            const actual = Number(item.actualCount ?? (item as any).count ?? 0);
            const hasChange = actual !== expected;
            
            if (hasChange) {
              console.log(`[InventorySubmission] Item ${item.productId} has change:`, {
                expected,
                actual,
                product_id: item.product_id,
                productId: item.productId,
              });
            }
            
            return hasChange;
          })
          .map((item) => {
            const actualQty = Number(item.actualCount ?? (item as any).count ?? 0);
            const productId = Number(item.product_id || item.productId || 0);
            
            console.log(`[InventorySubmission] Mapping changed item:`, {
              productId,
              actual_qty: actualQty,
              original_item: item,
            });
            
            return {
              product_id: productId,
              actual_qty: actualQty,
              comments: "",
            };
          });

        console.log("[InventorySubmission] Final changed items:", {
          count: changedItems.length,
          items: changedItems,
        });

        if (changedItems.length > 0) {
          console.log(
            `Recording opening inventory changes (${changedItems.length} items)`
          );
          await ShiftAPI.recordOpeningInventory({
            user_id: userIdNumeric,
            shift_id: backendShiftId,
            products: changedItems,
            comments: "Opening inventory count completed",
          });
        } else {
          console.log("No inventory changes; skipping inventory/open call");
        }

        // No explicit status update call in new API
      } catch (inventoryError) {
        console.error("Error during inventory registration:", inventoryError);
        // Don't rethrow - continue without inventory if it fails
      }

      // Step 3: Update local shift state
      console.log("Updating local shift state with ID:", backendShiftId);
      let localStateUpdateSuccessful = false;
      let createdShift = null;

      try {
        console.log(
          "Calling startShift in ShiftContext with backend ID:",
          backendShiftId
        );
        // Create proper inventory data for the context
        const contextInventory = inventory.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          expectedCount: item.expectedCount || 0,
          actualCount: item.actualCount || 0,
          discrepancy: item.discrepancy || 0,
          category: item.category || "",
        }));

        // Call startShift and store the result
        await startShift(cash, contextInventory, notes, backendShiftId);

        console.log(
          "ShiftContext.startShift completed successfully with ID:",
          backendShiftId
        );
        localStateUpdateSuccessful = true;
      } catch (shiftError) {
        console.error("Error updating local shift state:", shiftError);
        // Continue despite error - the backend shift is already created
      }

      // We've reached this point, meaning shift was started successfully at backend
      // Even if local state update failed, we should navigate user forward

      // Set loading to false before navigation
      setLoading(false);

      // Shift is started on the backend, proceed with navigation
      console.log(
        `Proceeding with navigation, local state update status: ${
          localStateUpdateSuccessful ? "successful" : "failed"
        }`
      );

      // Show confirmation and then navigate
      try {
        Alert.alert(
          "Shift Started",
          `Your shift has been started successfully with ID: ${backendShiftId}. Tap OK to continue to sales.`,
          [
            {
              text: "OK",
              onPress: () => {
                console.log("User confirmed, navigating to sales screen");
                navigateToSales();
              },
            },
          ],
          { cancelable: false }
        );
      } catch (navError) {
        console.error("Navigation alert error:", navError);
        // Try direct navigation as a fallback
        navigateToSales();
      }
    } catch (err: any) {
      console.error("Error in shift creation process:", err.message || err);

      // Handle cash continuity error specifically
      if (err.message && err.message.includes("Cash continuity error")) {
        // Extract expected amount from error message
        const expectedAmountMatch = err.message.match(/Expected starting cash R([\d.]+)/);
        if (expectedAmountMatch) {
          const expectedAmount = parseFloat(expectedAmountMatch[1]);
          console.log(`Cash continuity error detected. Expected: R${expectedAmount}, Retrying with correct amount...`);
          
          // Update the cash state and expected amount for future reference
          setCash(expectedAmount);
          setExpectedStartingCash(expectedAmount);
          
          try {
            // Retry with the expected amount
            const staffId = userData?.staff_id || user?.staffId || "STAFF_" + userId;
            const dateTime = new Date().toISOString();
            
            const retryShiftResponse = await ShiftAPI.openShift({
              user_id: userId !== undefined && userId !== null ? Number(userId) : 1,
              staff_id: staffId,
              date_time: dateTime,
              starting_cash: expectedAmount,
              comments: notes || "",
            });

            console.log("Shift opened successfully with expected amount:", retryShiftResponse);
            
            // Continue with the success flow
            const backendShiftId = retryShiftResponse?.data?.shift_id;
            
            if (backendShiftId) {
              // Update local context with the correct cash amount and shift ID
              let localStateUpdateSuccessful = false;
              try {
                await startShift(expectedAmount, inventory, notes, backendShiftId);
                localStateUpdateSuccessful = true;
              } catch (localError) {
                console.warn("Local state update failed:", localError);
              }

              setLoading(false);
              
              Alert.alert(
                "Shift Started", 
                `Your shift has been started successfully with ID: ${backendShiftId}. Starting cash was automatically set to R${expectedAmount.toFixed(2)} from previous shift.`,
                [
                  {
                    text: "OK",
                    onPress: () => {
                      console.log("User confirmed, navigating to sales screen");
                      navigateToSales();
                    },
                  },
                ],
                { cancelable: false }
              );
              return;
            }
          } catch (retryError: any) {
            console.error("Retry failed:", retryError);
            setError("Failed to start shift even with expected cash amount. Please contact support.");
          }
        }
      }

      // If there was a specific error message, show it
      const errorMessage =
        err.message || "Failed to start shift. Please try again.";
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
      setStep("notes");
      setLoading(false);
    }
  };

  // Helper function for navigation - can be called from multiple places
  const navigateToSales = () => {
    console.log("Navigating to sales screen, checking shift state first");

    // Check if we have a shift in the context
    if (currentShift) {
      console.log(
        `Navigation with active shift in context: ${currentShift.id}`
      );
    } else {
      console.warn("No active shift in context before navigation");
    }

    try {
      router.push("/(tabs)/sales");
      console.log("Navigation successful");
    } catch (e) {
      console.error("Navigation failed:", e);
      try {
        router.replace("/(tabs)/sales");
        console.log("Fallback navigation successful");
      } catch (e2) {
        console.error("Fallback navigation failed:", e2);

        try {
          // Last resort - try a different approach
          // Use any to bypass type checking as navigation APIs can vary
          (navigation as any).navigate?.("/(tabs)/sales");
          console.log("Last resort navigation successful");
        } catch (e3) {
          console.error("All navigation attempts failed");

          // Show error to user
          Alert.alert(
            "Navigation Error",
            "Your shift has been started, but we couldn't navigate automatically. Please go to the Sales screen manually.",
            [{ text: "OK" }]
          );
        }
      }
    }
  };

  const renderStepIndicator = (stepName: string, index: number) => {
    const steps = [
      { id: "pin", name: "PIN Verification" },
      { id: "cash", name: "Starting Cash" },
      { id: "inventory", name: "Inventory Count" },
      { id: "notes", name: "Notes" },
    ];

    const currentIndex = steps.findIndex((s) => s.id === step);
    const isCompleted = index < currentIndex;
    const isActive = index === currentIndex;

    return (
      <View key={stepName} style={tw`flex-1`}>
        <View style={tw`flex-row items-center justify-center`}>
          {index === 0 && <View style={tw`flex-1 h-0.5 bg-transparent`} />}

          {index > 0 && (
            <View
              style={[
                tw`flex-1 h-0.5`,
                index <= currentIndex ? tw`bg-blue-500` : tw`bg-gray-200`,
              ]}
            />
          )}

          <View
            style={[
              tw`w-8 h-8 rounded-full justify-center items-center mx-1`,
              isCompleted
                ? tw`bg-blue-500`
                : isActive
                ? tw`bg-blue-100 border-2 border-blue-500`
                : tw`bg-gray-200`,
            ]}
          >
            {isCompleted ? (
              <MaterialCommunityIcons name="check" size={16} color="white" />
            ) : (
              <GeistText
                style={[
                  isActive ? tw`text-blue-500` : tw`text-gray-500`,
                  typography.captionSemibold,
                ]}
              >
                {index + 1}
              </GeistText>
            )}
          </View>

          {index < steps.length - 1 && (
            <View
              style={[
                tw`flex-1 h-0.5`,
                index < currentIndex ? tw`bg-blue-500` : tw`bg-gray-200`,
              ]}
            />
          )}

          {index === steps.length - 1 && (
            <View style={tw`flex-1 h-0.5 bg-transparent`} />
          )}
        </View>

        <GeistText
          style={[
            tw`text-center mt-2`,
            isActive ? tw`text-blue-500` : tw`text-gray-500`,
            typography.caption,
          ]}
        >
          {steps[index].name}
        </GeistText>
      </View>
    );
  };

  // Add more robust effect to monitor shift state changes
  useEffect(() => {
    console.log(
      `Shift state change detected - currentShift: ${
        currentShift ? "present" : "null"
      }, step: ${step}, loading: ${loading}`
    );

    if (currentShift) {
      console.log(
        `Active shift detected with ID: ${currentShift.id}, user: ${currentShift.userId}, store: ${currentShift.storeId}`
      );
      console.log(
        `Shift details: startCash=${currentShift.startCash}, inventory=${
          currentShift.inventory?.length || 0
        } items`
      );

      // Only attempt navigation if user is still on the loading screen
      // and we haven't yet shown the alert
      // (to avoid double navigation with the direct Alert navigation)
      if (step === "loading" && !loading) {
        console.log(
          "Active shift detected in loading screen state - checking if navigation needed"
        );

        // Set a small timeout to ensure all state is settled
        // This is a fallback in case our primary navigation approach fails
        const timer = setTimeout(() => {
          // Only navigate if we're still on the loading screen
          if (step === "loading") {
            console.log(
              "Fallback navigation from effect - still on loading screen after delay"
            );
            navigateToSales();
          }
        }, 3000); // Longer delay to give the alert a chance to be dismissed

        // Clean up timer if component unmounts
        return () => clearTimeout(timer);
      }
    }
  }, [currentShift, loading, step]);

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <SafeAreaView style={tw`bg-[#3b82f6]`}>
        <LinearGradient
          colors={["#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw`p-3 sm:p-5 md:p-6`}
        >
          <GeistText
            style={[
              tw`text-white pt-5`,
              isMobile ? tw`text-xl` : tw`text-2xl`,
              typography.h1,
            ]}
          >
            Start New Shift
          </GeistText>

          {userData && (
            <View style={tw`mt-2 flex-row items-center`}>
              <MaterialCommunityIcons
                name="account"
                size={18}
                color="rgba(255,255,255,0.9)"
                style={tw`mr-2`}
              />
              <GeistText
                style={[tw`text-white text-opacity-90`, typography.body]}
              >
                {userData.first_name} {userData.last_name} •{" "}
                {userData.store_name || userData.store}
              </GeistText>
            </View>
          )}
        </LinearGradient>
      </SafeAreaView>

      <View
        style={tw`py-3 sm:py-4 px-3 sm:px-4 bg-white border-b border-gray-100`}
      >
        <View style={tw`flex-row`}>
          {["pin", "cash", "inventory", "notes"].map((stepName, index) =>
            renderStepIndicator(stepName, index)
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        {step === "pin" && (
          <View style={tw`flex-1 bg-white`}>
            <View style={tw`pt-6 pb-4 px-4 items-center`}>
              <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
                Enter Your PIN
              </GeistText>
              <GeistText
                style={[
                  tw`text-gray-500 text-center mt-2 max-w-sm`,
                  typography.body,
                ]}
              >
                Please enter your 6-digit security PIN to access the system
              </GeistText>
              <GeistText
                style={[
                  tw`text-blue-500 text-center mt-2`,
                  typography.captionSemibold,
                ]}
              >
                Your PIN was provided by your administrator
              </GeistText>
            </View>

            <PinKeypad
              pin={pin}
              setPin={setPin}
              onComplete={handlePinComplete}
              onError={setError}
              loading={loading}
              error={error}
            />
          </View>
        )}

        {step === "cash" && <CashEntryStep onComplete={handleCashComplete} expectedAmount={expectedStartingCash} />}

        {step === "inventory" && (
          <InventoryCountStep onComplete={handleInventoryComplete} />
        )}

        {step === "notes" && <NotesStep onComplete={handleNotesComplete} />}

        {step === "loading" && (
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
                Starting Shift...
              </GeistText>

              <GeistText
                style={[
                  tw`text-gray-500 text-center mt-2 mb-6`,
                  typography.body,
                ]}
              >
                Please wait while we set up your shift and prepare your register
              </GeistText>

              <View style={tw`w-full h-2 bg-gray-200 rounded-full mb-6`}>
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

              <View style={tw`w-full`}>
                {processingSteps.map((stepName, index) => (
                  <View
                    key={index}
                    style={[
                      tw`flex-row items-center mb-3`,
                      index > processingStep ? tw`opacity-40` : {},
                    ]}
                  >
                    <View
                      style={[
                        tw`w-6 h-6 rounded-full items-center justify-center mr-3`,
                        index < processingStep
                          ? tw`bg-green-500`
                          : index === processingStep
                          ? tw`bg-blue-500`
                          : tw`bg-gray-300`,
                      ]}
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
                        tw`text-gray-500`,
                        typography.body,
                        index < processingStep
                          ? tw`text-gray-500`
                          : index === processingStep
                          ? tw`text-gray-900`
                          : tw`text-gray-400`,
                      ]}
                    >
                      {stepName}
                    </GeistText>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
