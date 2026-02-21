import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    const user = url.searchParams.get("user");

    if (!endpoint || !user) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint or user parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let apiUrl = "";
    const params = new URLSearchParams();
    params.set("user", user);

    switch (endpoint) {
      case "positions":
        // Fetch all open positions with size > 0
        params.set("sizeThreshold", "0.1");
        params.set("limit", "100");
        apiUrl = `${DATA_API}/positions?${params.toString()}`;
        break;
      case "closed-positions": {
        // Paginate through ALL closed positions sorted by timestamp
        // The API silently caps at 50 results per page regardless of limit param
        const pageSize = 50;
        let offset = 0;
        let allPositions: unknown[] = [];
        while (true) {
          const pageParams = new URLSearchParams(params);
          pageParams.set("limit", String(pageSize));
          pageParams.set("offset", String(offset));
          pageParams.set("sortBy", "TIMESTAMP");
          pageParams.set("sortDirection", "DESC");
          const pageUrl = `${DATA_API}/closed-positions?${pageParams.toString()}`;
          console.log(`Fetching closed-positions page offset=${offset}`);
          const pageRes = await fetch(pageUrl);
          const pageData = await pageRes.json();
          if (!Array.isArray(pageData) || pageData.length === 0) break;
          allPositions = allPositions.concat(pageData);
          if (pageData.length < pageSize) break;
          offset += pageSize;
        }
        const totalPnl = (allPositions as Array<{realizedPnl?: number}>).reduce((s, p) => s + (p.realizedPnl ?? 0), 0);
        console.log(`Total closed positions fetched: ${allPositions.length}, sum realizedPnl: ${totalPnl.toFixed(2)}`);
        return new Response(JSON.stringify(allPositions), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "value":
        apiUrl = `${DATA_API}/value?${params.toString()}`;
        break;
      case "activity":
        params.set("limit", "100");
        apiUrl = `${DATA_API}/activity?${params.toString()}`;
        break;
      case "trades": {
        // Paginate through ALL trades for complete history
        const tradePageSize = 500;
        let tradeOffset = 0;
        let allTrades: unknown[] = [];
        while (true) {
          const tradeParams = new URLSearchParams(params);
          tradeParams.set("limit", String(tradePageSize));
          tradeParams.set("offset", String(tradeOffset));
          const tradeUrl = `${DATA_API}/trades?${tradeParams.toString()}`;
          console.log(`Fetching trades page offset=${tradeOffset}`);
          const tradeRes = await fetch(tradeUrl);
          const tradeData = await tradeRes.json();
          if (!Array.isArray(tradeData) || tradeData.length === 0) break;
          allTrades = allTrades.concat(tradeData);
          if (tradeData.length < tradePageSize) break;
          tradeOffset += tradePageSize;
        }
        console.log(`Total trades fetched: ${allTrades.length}`);
        return new Response(JSON.stringify(allTrades), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      default:
        return new Response(
          JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Fetching: ${apiUrl}`);
    const response = await fetch(apiUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
