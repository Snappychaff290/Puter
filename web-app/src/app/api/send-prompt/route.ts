import { NextResponse } from "next/server";

// Get the desktop client address
export async function GET(request) {
  try {
    // You could store this in an environment variable or config
    const desktopClientAddress =
      process.env.DESKTOP_CLIENT_ADDRESS || "localhost:3001";

    return NextResponse.json({
      success: true,
      address: desktopClientAddress,
    });
  } catch (error) {
    console.error("Error getting desktop client address:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get desktop client address" },
      { status: 500 }
    );
  }
}
