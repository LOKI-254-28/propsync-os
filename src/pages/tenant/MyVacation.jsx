import React from 'react';
import {useTenantData} from '@/lib/useTenantData';
import VacationNoticePage from '@/components/vacation/VacationNoticePage';
export default function MyVacation(){const data=useTenantData();return <VacationNoticePage data={data}/>;}