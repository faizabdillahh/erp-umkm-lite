/* ============================================================
   CALC.JS — Formula & Kalkulasi Bisnis
   ============================================================ */
'use strict';

const Calc = (() => {
  // ─── HPP & Harga ────────────────────────────────────────────

  /**
   * Menghitung HPP produk berdasarkan Bill of Materials.
   * @param {Array<{qty: number, buyPrice: number, wasteFactor?: number}>} materials
   * @param {number} [overheadPct=0] - Persentase overhead (0–100)
   * @returns {number} HPP total per unit produk dalam Rupiah
   */
  function hpp(materials, overheadPct = 0) {
    if (!Array.isArray(materials) || materials.length === 0) return 0;
    const rawCost = materials.reduce((sum, m) => {
      const effectiveQty = (m.qty ?? 0) * (1 + (m.wasteFactor ?? 0));
      return sum + (effectiveQty * (m.buyPrice ?? 0));
    }, 0);
    return rawCost * (1 + (overheadPct ?? 0) / 100);
  }

  /**
   * Menghitung HPP dengan overhead.
   */
  function hppWithOverhead(cost, overheadPct) {
    return (cost ?? 0) * (1 + (overheadPct ?? 0) / 100);
  }

  /**
   * Menghitung harga jual dari HPP dan target margin.
   */
  function sellPrice(cost, marginPct) {
    if ((cost ?? 0) <= 0) return 0;
    return cost / (1 - (marginPct ?? 0) / 100);
  }

  /**
   * Margin kotor (%).
   */
  function grossMargin(sell, cost) {
    if ((sell ?? 0) <= 0) return 0;
    return ((sell - cost) / sell) * 100;
  }

  /**
   * Margin bersih (%).
   */
  function netMargin(revenue, opex) {
    if ((revenue ?? 0) <= 0) return 0;
    return ((revenue - (opex ?? 0)) / revenue) * 100;
  }

  /**
   * Markup (%).
   */
  function markup(sell, cost) {
    if ((cost ?? 0) <= 0) return 0;
    return ((sell - cost) / cost) * 100;
  }

  // ─── Break Even Point ───────────────────────────────────────

  function bepUnit(fixedCost, sellPrice, varCost) {
    const margin = (sellPrice ?? 0) - (varCost ?? 0);
    if (margin <= 0) return Infinity;
    return (fixedCost ?? 0) / margin;
  }

  function bepRevenue(fixedCost, marginPct) {
    const ratio = (marginPct ?? 0) / 100;
    if (ratio <= 0) return Infinity;
    return (fixedCost ?? 0) / ratio;
  }

  function marginOfSafety(actualRev, bepRev) {
    if ((actualRev ?? 0) <= 0) return 0;
    return ((actualRev - bepRev) / actualRev) * 100;
  }

  // ─── Pelanggan ──────────────────────────────────────────────

  function clv(aov, frequency, years) {
    return (aov ?? 0) * (frequency ?? 0) * (years ?? 0);
  }

  function cac(marketingCost, newCustomers) {
    if ((newCustomers ?? 0) <= 0) return 0;
    return (marketingCost ?? 0) / newCustomers;
  }

  function retentionRate(repeat, total) {
    if ((total ?? 0) <= 0) return 0;
    return (repeat / total) * 100;
  }

  function churnRate(retention) {
    return 100 - (retention ?? 0);
  }

  // ─── Persediaan ────────────────────────────────────────────

  function inventoryTurnover(cogs, avgInventory) {
    if ((avgInventory ?? 0) <= 0) return 0;
    return (cogs ?? 0) / avgInventory;
  }

  function daysInventory(turnover) {
    if ((turnover ?? 0) <= 0) return 0;
    return 365 / turnover;
  }

  function reorderPoint(avgDaily, leadTime, safetyStock) {
    return ((avgDaily ?? 0) * (leadTime ?? 0)) + (safetyStock ?? 0);
  }

  // ─── Keuangan ──────────────────────────────────────────────

  function roi(netProfit, investment) {
    if ((investment ?? 0) <= 0) return 0;
    return (netProfit / investment) * 100;
  }

  function roa(netProfit, totalAssets) {
    if ((totalAssets ?? 0) <= 0) return 0;
    return (netProfit / totalAssets) * 100;
  }

  function currentRatio(currentAssets, currentLiabilities) {
    if ((currentLiabilities ?? 0) <= 0) return 0;
    return (currentAssets ?? 0) / currentLiabilities;
  }

  function quickRatio(cash, receivables, currentLiabilities) {
    if ((currentLiabilities ?? 0) <= 0) return 0;
    return ((cash ?? 0) + (receivables ?? 0)) / currentLiabilities;
  }

  function workingCapital(currentAssets, currentLiabilities) {
    return (currentAssets ?? 0) - (currentLiabilities ?? 0);
  }

  function depreciationStraightLine(cost, salvage, life) {
    if ((life ?? 0) <= 0) return 0;
    return ((cost ?? 0) - (salvage ?? 0)) / life;
  }

  function ebitda(netProfit, depreciation, interest, tax) {
    return (netProfit ?? 0) + (depreciation ?? 0) + (interest ?? 0) + (tax ?? 0);
  }

  // ─── Marketing ──────────────────────────────────────────────

  function roas(revenue, adSpend) {
    if ((adSpend ?? 0) <= 0) return 0;
    return (revenue ?? 0) / adSpend;
  }

  function ctr(clicks, impressions) {
    if ((impressions ?? 0) <= 0) return 0;
    return (clicks / impressions) * 100;
  }

  function conversionRate(conversions, leads) {
    if ((leads ?? 0) <= 0) return 0;
    return (conversions / leads) * 100;
  }

  function cpl(totalSpend, leads) {
    if ((leads ?? 0) <= 0) return 0;
    return (totalSpend ?? 0) / leads;
  }

  function cpa(totalSpend, conversions) {
    if ((conversions ?? 0) <= 0) return 0;
    return (totalSpend ?? 0) / conversions;
  }

  // ─── Produksi ──────────────────────────────────────────────

  function yieldRate(actual, planned) {
    if ((planned ?? 0) <= 0) return 0;
    return (actual / planned) * 100;
  }

  function defectRate(defects, total) {
    if ((total ?? 0) <= 0) return 0;
    return (defects / total) * 100;
  }

  function oee(availability, performance, quality) {
    return ((availability ?? 0) * (performance ?? 0) * (quality ?? 0)) / 10000;
  }

  // ─── Growth Rate ───────────────────────────────────────────

  function growthRate(current, previous) {
    if ((previous ?? 0) <= 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  // ─── Public API ─────────────────────────────────────────────
  return {
    hpp,
    hppWithOverhead,
    sellPrice,
    grossMargin,
    netMargin,
    markup,
    bepUnit,
    bepRevenue,
    marginOfSafety,
    clv,
    cac,
    retentionRate,
    churnRate,
    inventoryTurnover,
    daysInventory,
    reorderPoint,
    roi,
    roa,
    currentRatio,
    quickRatio,
    workingCapital,
    depreciationStraightLine,
    ebitda,
    roas,
    ctr,
    conversionRate,
    cpl,
    cpa,
    yieldRate,
    defectRate,
    oee,
    growthRate,
  };
})();