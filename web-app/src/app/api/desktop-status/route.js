import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const desktopClientAddress =
      process.env.DESKTOP_CLIENT_ADDRESS || "localhost:3001";
    const response = await fetch(`http://${desktopClientAddress}/status`);

    if (!response.ok) {
      throw new Error(`Failed to fetch desktop status: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      status: data,
    });
  } catch (error) {
    console.error("Error checking desktop client status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check desktop client status",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
