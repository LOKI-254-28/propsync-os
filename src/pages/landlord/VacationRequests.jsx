import React from 'react';
import {usePortfolioData} from '@/lib/useAppData';
import VacationNoticePage from '@/components/vacation/VacationNoticePage';
export default function VacationRequests(){const data=usePortfolioData();return <VacationNoticePage data={data} manager/>;}