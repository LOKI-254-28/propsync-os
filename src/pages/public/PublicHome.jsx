import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { usePublicListings } from "@/lib/usePublicListings";
import PublicLayout from "@/components/public/PublicLayout";
import HomeHero from '@/components/home/HomeHero';
import HomeFeaturedRentals from '@/components/home/HomeFeaturedRentals';
import HomeExperience from '@/components/home/HomeExperience';
import '@/components/home/HomePresentation.css';

export default function PublicHome() {
  const { isLoadingAuth } = useAuth();
  const { listings, properties, units, loading } = usePublicListings();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  if (isLoadingAuth) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  }


  const featured = (listings || []).filter((l) => l.status === "Published").slice(0, 6);

  const submitSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (maxPrice) params.set("max", maxPrice);
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <PublicLayout home>
      <HomeHero search={search} setSearch={setSearch} type={type} setType={setType} maxPrice={maxPrice} setMaxPrice={setMaxPrice} submitSearch={submitSearch} />
      <HomeFeaturedRentals featured={featured} properties={properties} units={units} loading={loading} />
      <HomeExperience />
    </PublicLayout>
  );
}